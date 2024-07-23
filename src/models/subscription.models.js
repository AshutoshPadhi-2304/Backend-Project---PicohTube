import mongoose,{ Schema } from "mongoose";

const subscriptionSchema = new Schema({
    subscriber:{            // one who is subscribed
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    channels:{              // one to whom subscriber is subscribing to
        type: Schema.Types.ObjectId,
        ref : "User"
    }
}, {timestamps : true})

export const Subscription = mongoose.model("Subscription", subscriptionSchema)