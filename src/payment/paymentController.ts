import { Request, Response } from "express";
import { PaymentGW } from "./paymentTypes";
import orderModel from "../order/orderModel";
import { PaymentStatus } from "../order/orderTypes";
import { MessageBroker } from "../types/broker";

export class PaymentController {
  constructor(
    private paymentGw: PaymentGW,
    private broker: MessageBroker,
  ) {}
  handleWebhook = async (req: Request, res: Response) => {
    const webhookBody = req.body;
    if (webhookBody.type === "checkout.session.completed") {
      const verifiedSession = await this.paymentGw.getSession(
        webhookBody.data.object.id,
      );

      const isPaymentSuccess = verifiedSession.paymentStatus === "paid";
      const updateOrder = await orderModel.findOneAndUpdate(
        {
          _id: verifiedSession.metadata.orderId,
        },
        {
          paymentStatus: isPaymentSuccess
            ? PaymentStatus.PAID
            : PaymentStatus.FAILED,
        },
        {
          new: true,
        },
      );
      await this.broker.sendMessage("order", JSON.stringify(updateOrder));
    }
    return res.json({ success: true });
  };
}
