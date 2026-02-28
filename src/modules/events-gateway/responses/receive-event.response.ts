import { ApiProperty } from "@nestjs/swagger";

export class ReceiveEventResponse {
    @ApiProperty({
        description: 'Status of the event ingestion',
        example: 'accepted'
    })
    status!: string;
}
