import { UserDTO } from "../../types/dtos/UserDTO";
import { UserEntity } from "../../types/entities/UserEntity";

export const userMapper = {

    toDto(userEntity: UserEntity): UserDTO {
        return {
            username: userEntity.username,
            password: userEntity.password,
            email: userEntity.email,
            emailVerified: Boolean(userEntity.email_verified),
            active: Boolean(userEntity.active),
            createdAt: userEntity.created_at,
            modifiedAt: userEntity.modified_at,
            id: userEntity.id
        };
    },

    toDTOs(userEntities: UserEntity[]): UserDTO[] {
        return userEntities.map(this.toDto);
    },

    toInsertEntity(userDTO: UserDTO): Omit<UserEntity, "id" | "created_at" | "modified_at"> {
        return {
            username: userDTO.username,
            password: userDTO.password,
            email: userDTO.email,
            email_verified: userDTO.emailVerified,
            active: userDTO.active
        };
    },

    toUpdateEntity(userDTO: UserDTO): Omit<UserEntity, "created_at" | "modified_at"> {
        return {
            id: userDTO.id,
            username: userDTO.username,
            password: userDTO.password,
            email: userDTO.email,
            email_verified: userDTO.emailVerified,
            active: userDTO.active
        };
    }
};