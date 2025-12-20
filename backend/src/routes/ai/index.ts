import express from 'express'
import { ROUTES_NAMES } from '@financial-ai/types'
import { askAI } from './ask'


const router = express.Router()

router.post(ROUTES_NAMES.AI.apis.ask, askAI)

export default router
