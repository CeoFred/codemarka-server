import {expect} from "chai";
import app from "../src/server";
import {agent as request} from "supertest";
import { User } from "../src/models/User";

after((done) => {
    app.close(done);
});

before((done) => {
    User.findOneAndDelete({email:"test@example.com"}).then(() => {
        done();
    });
});

describe("User Authentication", () => {
    const user = {
        username: "testi",
        password: "testiii",
        email:"test@example.com"
    };

    var token: string;

    it("should Fail to fetch User with no Authorization", async function () {
        const res = await request(app).get("/api/v1/user/u/3435353");
        await expect(res.status).to.equal(403);
    });

    it("should create a new user", async function () {
        const res = await request(app)
            .post("/api/v1/auth/user/signup")
            .send(user)
            .set("Content-Type", "application/json")
            .expect(200);
    });

    it("should Login a  user", async function () {
        const res = await request(app)
            .post("/api/v1/auth/user/signin")
            .send(user)
            .set("Content-Type", "application/json")
            .expect(200);
        token = res.body.data.token;
    });
    

    it("should fail to fetch user by email or username ", async () => {
        const res =  await request(app).get("/api/v1/user/find/codemon");
        await expect(res.status).to.equal(403);
    });

    it("should fetch a user by email or username", async  () => {
        const res = await request(app)
            .get(`/api/v1/user/find/${user.username.replace("ti","")}`)
            .set("Authorization",`Bearer ${token}`);
        await expect(res.status).to.equal(200);
        await expect(res.body.message[0].username).to.equal(user.username);
    });
});
