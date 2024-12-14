import { NextFunction, Request, Response } from "express";
import  jwt  from "jsonwebtoken";
import { JWT_SECRET } from "./config";

export function authMiddleware(req: Request, res: Response, next: NextFunction){
    const authHeader = req.header("authorization")
    try {
        //@ts-ignore
        const decoded = jwt.verify(authHeader, JWT_SECRET)
    } catch (error) {
        
    }
   

}