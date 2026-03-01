import { Injectable, NestMiddleware, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto";

@Injectable()
export class HmacMiddleware implements NestMiddleware {

    private readonly secret: string | undefined;

    constructor(private readonly configService: ConfigService) {
        this.secret = this.configService.get<string>('app.webhookSecret');
    }

    use(req: any, res: any, next: (error?: any) => void): any {

        // for testing in swagger
        if (this.secret == '7f2ba217a561ad4b51c3f1e432c701eedbdcdc8b8c8538c6f4d65077395d9e25' ) {
           return next();
        }

        if (!this.secret) {
            throw new Error('HMAC secret is not configured in the application config');
        }

        const signature = req.headers['x-signature'] as string;

        if (!signature) {
            throw new UnauthorizedException('Missing signature');
        }

        const payload = req.rawBody as Buffer;
        if (!payload) {
            throw new Error('Raw body is missing. Ensure NestExpressApplication is configured with rawBody: true');
        }

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