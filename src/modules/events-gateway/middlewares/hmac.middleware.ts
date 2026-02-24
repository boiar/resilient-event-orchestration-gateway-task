import {Injectable, NestMiddleware, UnauthorizedException} from "@nestjs/common";
import * as crypto  from "crypto";

@Injectable()
export class HmacMiddleware implements NestMiddleware {
    use(req: any, res: any, next: (error?: any) => void): any {
        const secret = process.env.WEBHOOK_SECRET || 'my-secret-key-123';
        const signature = req.headers['x-signature'] as string;

        if (!signature) {
            throw new UnauthorizedException('Missing signature');
        }

        const payload = JSON.stringify(req.body);
        const hash = crypto.createHmac('sha256', secret).update(payload).digest('hex');

        if (hash !== signature) {
            throw new UnauthorizedException('Invalid signature');
        }

        next();
    }

}