import { Injectable, NestMiddleware, UnauthorizedException } from "@nestjs/common";
import * as crypto from "crypto";

@Injectable()
export class HmacMiddleware implements NestMiddleware {

    private readonly secret: string;

    constructor() {
        this.secret = process.env.WEBHOOK_SECRET || 'my-secret-key-123';
    }

    use(req: any, res: any, next: (error?: any) => void): any {
        const signature = req.headers['x-signature'] as string;

        if (!signature) {
            throw new UnauthorizedException('Missing signature');
        }

        const payload = req.rawBody || JSON.stringify(req.body);
        const hash = crypto.createHmac('sha256', this.secret).update(payload).digest('hex');

        if (signature.length !== hash.length) {
            throw new UnauthorizedException('Invalid signature');
        }

        const sigBuffer = Buffer.from(signature, 'utf8');
        const hashBuffer = Buffer.from(hash, 'utf8');

        if (!crypto.timingSafeEqual(sigBuffer, hashBuffer)) {
            throw new UnauthorizedException('Invalid signature');
        }

        next();
    }

}