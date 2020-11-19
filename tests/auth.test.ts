import {expect} from "chai";
import app from "../src/server";
import {agent as request} from "supertest";

after((done) => {
    app.close(done);
});


describe("Index Auth Test", () => {
    it("should always pass", function () {
        expect(true).to.equal(true);
    });
    
    it("should GET /api/v1", async function () {
        const res = await request(app).get("/api/v1");
        await expect(res.status).to.equal(200);
    });
});
