import express from 'express'
import { ROUTES_NAMES, PVerifyCodeParams } from '@financial-ai/types'
import { authLogin } from './login'
import { authCheck } from './check'
import { authLogout } from './logout'
import { hubspotExchangeToken } from './hubspotExchangeToken'

const router = express.Router()

router.post(ROUTES_NAMES.AUTH.apis.login, authLogin)
router.post(ROUTES_NAMES.AUTH.apis.check, authCheck)
router.post(ROUTES_NAMES.AUTH.apis.logout, authLogout)
router.post(ROUTES_NAMES.AUTH.apis.hubspot, hubspotExchangeToken)

export default router
