import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import jwt from 'jsonwebtoken'
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { JWT_SECRET } from "../config";
const router = Router()


const s3Client = new S3Client({
    credentials: {
        accessKeyId: process.env.ACCESS_KEY_ID ?? "",
        secretAccessKey: process.env.ACCESS_SECRET ?? "",
    },
    region: "us-east-1"
})

const client = new PrismaClient()

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

router.get("/presignedUrl", async (req, res) => {
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