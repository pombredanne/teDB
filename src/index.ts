/**
 * Created by tsturzl on 4/11/17.
 */

import Datastore from "./datastore";
import Cursor from "./cursor";
import Index from "./indices";

import { IIndex } from "./indices";
import { Ioptions } from "./cursor";
import { IDatastore } from "./datastore";
import { IStorageDriver, IRange } from "./types";

export { range, isEmpty, getDate, compareArray, rmDups, getPath, Base64 } from "./utils";
export { Datastore, IDatastore};
export { Cursor, Ioptions };
export { Index, IIndex };
export { IStorageDriver };
export { IRange };
