import { Prisma, PrismaClient } from "@prisma/client";
import { Router } from "express";
import jwt from 'jsonwebtoken'
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { createPresignedPost } from '@aws-sdk/s3-presigned-post'
import { JWT_SECRET, TOTAL_DECIMALS } from "../config";
import { authMiddleware } from "../middleware";
import { createTaskInput } from "../types";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
const router = Router()
const connection = new Connection(process.env.RPC_URL ?? "");

const PARENT_WALLET_ADDRESS = "2KeovpYvrgpziaDsq8nbNMP4mc48VNBVXb5arbqrg9Cq";
    
const DEFAULT_TITLE = "Select the most clickable thumbnail";


const s3Client = new S3Client({
    credentials: {
        accessKeyId: process.env.ACCESS_KEY_ID ?? "",
        secretAccessKey: process.env.ACCESS_SECRET ?? "",
    },
    region: "us-east-1"
})

const client = new PrismaClient()

router.post('/task', authMiddleware, async (req,res)=>{
    
        //@ts-ignore
        const userId = req.userId
        // validate the inputs from the user;
        const body = req.body;
    
        const parseData = createTaskInput.safeParse(body);
    
        const user = await client.user.findFirst({
            where: {
                id: userId
            }
        })
    
        if (!parseData.success) {
             res.status(411).json({
                message: "You've sent the wrong inputs"
            })
            return
        }
    
        const transaction = await connection.getTransaction(parseData.data.signature, {
            maxSupportedTransactionVersion: 1
        });
    
        console.log(transaction);
        if ((transaction?.meta?.postBalances[1] ?? 0) - (transaction?.meta?.preBalances[1] ?? 0) !== 100000000) {
             res.status(411).json({
                message: "Transaction signature/amount incorrect"
            })
            return
        }
    
        if (transaction?.transaction.message.getAccountKeys().get(1)?.toString() !== PARENT_WALLET_ADDRESS) {
             res.status(411).json({
                message: "Transaction sent to wrong address"
            })
            return 
        }
    
        if (transaction?.transaction.message.getAccountKeys().get(0)?.toString() !== user?.address) {
             res.status(411).json({
                message: "Transaction sent to wrong address"
            })
            return
        }
    
        let response = await client.$transaction(async tx => {
            const response = await tx.task.create({
                data: {
                    title: parseData.data.title ?? DEFAULT_TITLE,
                    amount: 0.1 * TOTAL_DECIMALS,
                    //TODO: Signature should be unique in the table else people can reuse a signature
                    signature: parseData.data.signature,
                    user_id: userId
                }
            });
    
            await tx.option.createMany({
                data: parseData.data.options.map(x => ({
                    image_url: x.imageUrl,
                    task_id: response.id
                }))
            })
    
            return response;
    
        })
    
        res.json({
            id: response.id
        })
    
    })
 

router.post('/signin',async (req,res)=>{
    const hardcodedWalletAddress = '8YSsiNNntvpegmBYZNLQ4RttgzMU9osxaowyJZ53gFTi'
    const existingUser = await client.user.findFirst({
        where:{
            address: hardcodedWalletAddress
        }
    })
    if(existingUser){
        const token = jwt.sign({
            userId:existingUser.id
        }, JWT_SECRET)
    }else{
        const user = await client.user.create({
            data:{
                address: hardcodedWalletAddress,

            }
        })
        const token = jwt.sign({
            userId:user.id
        }, JWT_SECRET)
        res.json({token})
    }


})

router.get("/presignedUrl", authMiddleware ,async (req, res) => {
    // @ts-ignore
    const userId = req.userId;

    const { url, fields } = await createPresignedPost(s3Client, {
        Bucket: 'web-3-saas',
        Key: `${userId}/${Math.random()}/image.jpg`,
        Conditions: [
          ['content-length-range', 0, 5 * 1024 * 1024] 
        ],
        Expires: 3600
    })

    res.json({
        preSignedUrl: url,
        fields
    })
    
})

export default router