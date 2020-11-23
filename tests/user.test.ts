import {expect} from "chai";
import app from "../src/server";
import {agent as request} from "supertest";
import { User } from "../src/models/User";

after((done) => {
    app.close(done);
});

beforeEach((done) => {
    User.findOneAndDelete({email:"test@example.com"}).then(() => {
        done();
    });
});

describe("User", () => {
    
    it("should Fail to fetch User with no Authorization", async function () {
        const res = await request(app).get("/api/v1/user/u/3435353");
        await expect(res.status).to.equal(404);
    });

    it("should create a new user", async function () {
        await request(app)
            .post("/api/v1/auth/user/signup")
            .send({email:"test@example.com", username: "testi",password: "testiii"})
            .set("Content-Type", "application/json")
            .expect(200);
    
    });
});
