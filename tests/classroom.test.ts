import {expect} from "chai";
import app from "../src/server";
import {agent as request} from "supertest";


describe("Classroom Test", () => {
    it("should fail to disconnect socket POST /api/v1/classroom", async function () {
        const res = await request(app).post("/api/v1/classroom/socket/disconnet");
        await expect(res.status).to.equal(404);
    });
});
