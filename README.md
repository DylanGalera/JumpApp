# Financial AI

## App Demo
To evaluate the application, please use the following link:
[https://jumpapp-zeta.vercel.app/](https://jumpapp-zeta.vercel.app/)

**Authentication Steps:**
1. Log in using your **Google account**.
2. Once logged in, connect your **HubSpot account** by clicking the "Connect HubSpot" button.

---

## Planned Improvements
The following enhancements are identified to optimize the current version of the application:

**Data Fetching & Processing:** Upon a user's first login, the system fetches emails, events, and contacts spanning the **past 10 days**, capped at **200 records**. Due to the constraints of using free AI models and tools, processing this volume of data takes time; upgrading to local AI tools or professional paid models would allow us to extend these limits and improve performance.
* **Transition to Webhooks:** Currently, the app uses **polling** to fetch new data (calendar events, emails, and HubSpot contacts). Implementing webhooks would allow the AI to analyze and act upon new data in real-time as soon as events occur.
* **Model Rate Limits:** The app currently utilizes the `gemini-flash-latest` free tier. Due to API limitations, users are restricted to **20 requests per day**. To bypass this, the API key must be rotated, or the backend must be upgraded to a paid tier.
* **Socket Connectivity:** Because the backend is hosted on the **Render.io free tier**, Socket.io connections may be terminated after a period of inactivity. Users may need to refresh the page to re-establish the connection.

---

## Local Development Setup

To run the application locally, you must add `.env` files to both the `frontend` and `backend` directories. Refer to the `.env.example` files in each folder for the required parameters.

### Frontend Setup

Run the frontend using **Nx**:
```sh
npx nx serve frontend
```

Alternatively, use the npm script:

```sh
npm run app
```

### Backend Setup

Run the backend service:
Run the frontend using **Nx**:
```sh
npx nx serve backend
```

Alternatively, use the npm script:

```sh
npm start
```
