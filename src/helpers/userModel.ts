import { User, UserDocument } from "../models/User";

export const findUser = function (id: string): any {
  

    return new Promise((resolve,reject) => {
        if(id && id.trim() === ""){
            console.log("UE");
            reject(false);
        }
        
        User.findById(id).then((user: UserDocument) => {
            if(user && user !== null){
                resolve(user);
            }
        
        }).catch((err) => {
            reject(false);
        });

    });
  
};