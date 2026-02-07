export class CreateCredentialDto {
    name: string;
    type: 'git' | 'docker-registry';
    username?: string;
    secret: string; // Token or Password
}
