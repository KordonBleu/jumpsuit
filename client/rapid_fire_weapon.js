import RapidFireWeapon from '../shared/rapid_fire_weapon.js';
import Shot from './shot.js';

RapidFireWeapon.prototype.shotType = Shot.prototype.TYPES.BULLET;

export default RapidFireWeapon;
