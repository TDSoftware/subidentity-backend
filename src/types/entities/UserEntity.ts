export interface UserEntity {
    id: number;
    username: string;
    password: string;
    email: string;
    email_verified: boolean;
    active: boolean;
    modified_at: Date;
    created_at: Date;
}