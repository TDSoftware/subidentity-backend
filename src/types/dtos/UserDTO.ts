export interface UserDTO {
    id: number;
    username: string;
    password: string;
    email: string;
    active: boolean;
    emailVerified: boolean;
    createdAt: Date;
    modifiedAt: Date;
}