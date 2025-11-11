import { handleRegistryABI } from './handleRegistryABI';

export { handleRegistryABI };

export const handleRegistryBytecode = (import.meta.env.VITE_HANDLE_REGISTRY_BYTECODE || '').trim();

export function hasHandleRegistryArtifact() {
  return typeof handleRegistryBytecode === 'string'
    && handleRegistryBytecode.startsWith('0x')
    && handleRegistryBytecode.length > 2;
}
