/**
 * Shared kernel — domain-agnostic primitives used by action implementations.
 * Action modules should import from this barrel, not from individual files,
 * so we can rearrange internals without touching downstream code.
 */

export { ETH_ADDRESS, addressEquals, formatTokenAmount, isNativeEth } from './format';
export {
  type TokenSelectValue,
  parseTokenSelectValue,
  stringifyTokenSelectValue,
} from './tokenSelect';
export { multiActionId } from './multiActionId';
export { decodeArgs, matchSignature, matchTarget } from './decode';
export {
  makeAddressAction,
  makeNoArgAction,
  makeStringAction,
  makeUintAction,
} from './factories';
