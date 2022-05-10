import { userRepository } from "../repositories/userRepository";
import { UserDTO } from "../types/dtos/UserDTO";
import { userMapper } from "./mapper/userMapper";

export const userService = {

    async getAll(): Promise<UserDTO[]> {
        const users = await userRepository.getAll();
        return userMapper.toDTOs(users);
    },

    async addUser(userDTO: UserDTO): Promise<UserDTO> {
        userDTO.emailVerified = false;
        userDTO.active = true;
        const userEntity = await userRepository.insert(userMapper.toInsertEntity(userDTO));
        return userMapper.toDto(userEntity);
    },

    async updateUser(userDTO: UserDTO): Promise<UserDTO> {
        const userEntity = await userRepository.update(userMapper.toUpdateEntity(userDTO));
        return userMapper.toDto(userEntity);
    },

    async findByUsername(username: string): Promise<UserDTO|undefined> {
        const userEntity = await userRepository.findByUsername(username);
        if(!userEntity) return;
        return userMapper.toDto(userEntity);
    }
    
};