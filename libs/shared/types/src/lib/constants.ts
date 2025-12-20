export const ROUTES_NAMES = {
    AUTH: {
        name: '/auth',
        apis: {
            login: '/login',
            check: '/check',
            logout: '/logout',
            hubspot: '/exchange-hubspot-token'
        }
    },
    INSTRUCTION: {
        name: '/instruction',
        apis: {
            webhook: '/gmail-webhooks',
        }
    }
}
