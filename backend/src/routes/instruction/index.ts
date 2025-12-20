import express from 'express'
import { ROUTES_NAMES, PVerifyCodeParams } from '@financial-ai/types'
import { webhook } from './webhook'

const router = express.Router()

router.post(ROUTES_NAMES.INSTRUCTION.apis.webhook, webhook)

export default router
