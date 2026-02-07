import { Injectable, Logger } from '@nestjs/common';
import { Client, ConnectConfig } from 'ssh2';

export interface SshCommandResult {
    code: number;
    stdout: string;
    stderr: string;
}

@Injectable()
export class SshService {
    private logger = new Logger(SshService.name);

    /**
     * Executes a command on a remote server.
     * Establishes a new connection, executes the command, and disconnects.
     * Useful for stateless operations.
     */
    async executeCommand(
        config: ConnectConfig,
        command: string,
    ): Promise<SshCommandResult> {
        return new Promise((resolve, reject) => {
            const conn = new Client();

            conn.on('ready', () => {
                this.logger.debug(`SSH Connected. Executing: ${command}`);

                conn.exec(command, (err, stream) => {
                    if (err) {
                        conn.end();
                        return reject(err);
                    }

                    let stdout = '';
                    let stderr = '';

                    stream.on('close', (code: number, signal: any) => {
                        this.logger.debug(`SSH Stream Closed. Code: ${code}`);
                        conn.end();
                        resolve({ code, stdout, stderr });
                    }).on('data', (data: any) => {
                        stdout += data.toString();
                    }).stderr.on('data', (data: any) => {
                        stderr += data.toString();
                    });
                });
            }).on('error', (err) => {
                this.logger.error(`SSH Connection Error: ${err.message}`);
                reject(err);
            }).connect(config);
        });
    }

    /**
     * Defines file content on remote server.
     * Validates directory existence implicitly (fails if dir doesn't exist).
     */
    async uploadFileContent(
        config: ConnectConfig,
        remotePath: string,
        content: string,
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            const conn = new Client();

            conn.on('ready', () => {
                conn.sftp((err, sftp) => {
                    if (err) {
                        conn.end();
                        return reject(err);
                    }

                    const stream = sftp.createWriteStream(remotePath);

                    stream.on('close', () => {
                        this.logger.debug(`File uploaded: ${remotePath}`);
                        conn.end();
                        resolve();
                    });

                    stream.on('error', (err) => {
                        conn.end();
                        reject(err);
                    });

                    stream.write(content);
                    stream.end();
                });
            }).on('error', (err) => {
                reject(err);
            }).connect(config);
        });
    }
}
