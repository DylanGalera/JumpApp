import express from 'express'
import { ROUTES_NAMES, PVerifyCodeParams } from '@financial-ai/types'
import { authUser } from './auth'

const router = express.Router()

router.post(ROUTES_NAMES.AUTH.apis.verify, authUser)

export default router
