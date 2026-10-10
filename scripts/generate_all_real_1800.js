// scripts/generate_all_real_1800.js
// Standalone Builder for 1,800 100% Unique, Real-World Global Securities

import fs from 'fs';
import path from 'path';
import { IPOS } from '../generator/ipos.js';
import { COMMODITIES_RAW } from '../generator/commodities.js';
import { ETFS_RAW } from '../generator/etfs.js';
import { BONDS_RAW } from '../generator/bonds.js';

console.log('Generating 1,800 Real-World Unique Securities Database...');
