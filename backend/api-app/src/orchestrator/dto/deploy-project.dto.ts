export interface PolyRepoConfig {
    folder: string;
    repositoryUrl: string;
    branch: string;
    gitCredentialId?: number; // Optional: For private repos
}

export class DeployProjectDto {
    targetId: number;
    projectId: string; // The UUID of the project
    yamlContent: string; // The generated Docker Compose YAML
    repositoryUrl?: string; // Optional: Git repo to clone
    branch?: string; // Optional: Git branch (default: main)
    polyRepos?: PolyRepoConfig[]; // Optional: List of repos for polyrepo strategy
    gitCredentialId?: number; // Optional: For private Monorepo
}
