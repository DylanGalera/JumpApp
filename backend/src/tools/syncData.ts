import { Server } from "socket.io";
import { syncUserGmail } from "../services/gmail.service";
import { syncHubspotData } from "../services/hubspot.sync";

export function syncUserData(userId: string, io: Server) {
    Promise.all([
        syncUserGmail(userId),
        syncHubspotData(userId)]).then(r => {
            io.to(userId).emit("message", "Fetching data finished, Now you can ask anything related to your data");
        })
}