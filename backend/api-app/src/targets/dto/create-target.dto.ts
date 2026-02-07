export class CreateTargetDto {
    name: string;
    host: string;
    port?: number;
    username: string;

    // One of these must be provided
    password?: string;
    privateKey?: string;
}
