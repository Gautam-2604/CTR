import express from 'express'
import userRouter from '../src/routes/user.routes'
import workerRouter from '../src/routes/worker.routes'
const app = express()

app.use('/v1/user', userRouter)
app.use('/v1/worker', workerRouter)

app.listen(3000)