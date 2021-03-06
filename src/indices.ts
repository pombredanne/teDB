/**
 * Created by tsturzl on 4/11/17.
 */
import { getPath } from "./utils";
import Datastore from "./datastore";
import { IRange, IindexOptions } from "./types";
import { compareArray } from "./utils";
import * as BTT from "binary-type-tree";

/**
 * Index interface used for the datastore indices
 * Inherits types from binary-type-tree
 *
 * Array String Number, Date, Boolean, -> symbol was redacted.
 * BTT.ASNDBS = Array<any[]|string|number|Date|boolean|null>|string|number|Date|boolean|null
 * -> redacted symbol, Number, Date, Boolean, String, Array
 * BTT.SNDBSA = Array<{}|any[]|string|number|Date|boolean|null>;
 */
export interface IIndex {
    insert(doc: any): Promise<any>;
    insertMany(key: BTT.ASNDBS, indices: any[]): Promise<null>;
    updateKey(key: BTT.ASNDBS, newKey: BTT.ASNDBS): Promise<any>;
    remove(doc: any): Promise<any>;
    toJSON(): Promise<string>;
    search(key: BTT.ASNDBS): Promise<BTT.SNDBSA>;
    searchRange(range: IRange): Promise<BTT.SNDBSA>;
}

export default class Index implements IIndex {
    /** Field Name for Index */
    protected fieldName: string;
    /** ALV Tree for indexing */
    private avl: BTT.AVLTree;
    /** Reference to Datastore */
    private datastore: Datastore;
    /** Is the index holding an array */
    private isArray: boolean;

    /**
     * Constructor
     * @param datastore - reference to Datastore
     * @param options - Options for Index, `{fieldName: string}`
     */
    constructor(datastore: Datastore, options: IindexOptions) {
        this.avl = options.unique ? new BTT.AVLTree({unique: true}) : new BTT.AVLTree({});

        if (options.compareKeys) {
            this.avl.compareKeys = options.compareKeys;
        }
        if (options.checkKeyEquality) {
            this.avl.checkKeyEquality = options.checkKeyEquality;
        }

        this.isArray = false;

        this.fieldName = options.fieldName;
        this.datastore = datastore;
    }

    /**
     * Insert document into Index
     * @param doc - document to insert into Index
     * @returns {Promise<any>}
     */
    public insert(doc: any): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            // TODO: need to make Error types
            if (!doc.hasOwnProperty("_id")) {
                return reject(new Error("Document is missing _id field"));
            }
            if (typeof doc._id !== "string") {
                return reject(new Error("_id field needs to be type `string`"));
            }

            const key: BTT.ASNDBS = getPath(doc, this.fieldName);
            if (key !== undefined && key !== null) {
                if (key.constructor.name === "Array" && !this.isArray) {
                    this.avl.compareKeys = compareArray;
                    this.isArray = true;
                }
            } else {
                return reject(new Error("Key was not retrieved from document"));
            }

            try {
                this.avl.insert(key, doc._id);
            } catch (e) {
                return reject(e);
            }

            resolve(doc);
        });
    }

    /**
     * Inserts many documents and updates the indices
     * @param key
     * @param indices
     * @returns {Promise<null>}
     */
    public insertMany(key: BTT.ASNDBS, indices: any[]): Promise<null> {
        return new Promise<null>((resolve, reject) => {
            if (key !== undefined && key !== null) {
                if (key.constructor.name === "Array" && !this.isArray) {
                    this.avl.compareKeys = compareArray;
                    this.isArray = true;
                }
            } else {
                return reject(new Error("Key was not retrieved"));
            }

            try {
                for (const item of indices) {
                    this.avl.insert(item.key, [item.value]);
                }
            } catch (e) {
                return reject(e);
            }

            resolve();
        });
    }

    /**
     * Update a key of a tree
     * - keys are actually the value, in the tree the keys are values
     * of the to be updated document while the value in the tree is the
     * _id of the to be updated document.
     * @param key
     * @param newKey
     * @returns {Promise<null>}
     */
    public updateKey(key: BTT.ASNDBS, newKey: BTT.ASNDBS): Promise<null> {
        return new Promise<null>((resolve, reject) => {
            if (this.avl.tree.search(key).length === 0) {
                return reject(new Error("This key does not exist"));
            }
            try {
                this.avl.updateKey(key, newKey);
            } catch (e) {
                return reject(e);
            }
            resolve();
        });
    }

    /**
     * Remove document from Index
     * @param doc
     * @returns {Promise<any>}
     */
    public remove(doc: any): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            if (!doc.hasOwnProperty("_id")) {
                return reject(new Error("There is no _id to reference this document"));
            }

            const key: BTT.ASNDBS = getPath(doc, this.fieldName);

            try {
                this.avl.delete(key, [doc._id]);
            } catch (e) {
                return reject(e);
            }

            resolve(doc);
        });
    }

    /**
     * Return the tree as JSON [{ key, value }, ...] pairs.
     * @returns {Promise<string>}
     */
    public toJSON(): Promise<string> {
        return new Promise<string>((resolve) => {
            resolve(this.avl.tree.toJSON<BTT.AVLTree>());
        });
    }

    /**
     * Search Index for key
     * @param key
     * @returns {Promise<BTT.SNDBSA>}
     */
    public search(key: BTT.ASNDBS): Promise<BTT.SNDBSA> {
        return new Promise<BTT.SNDBSA>((resolve) => {
            resolve(this.avl.tree.search(key));
        });
    }

    /**
     * Search Index within bounds
     * @param range An IRange to search within bounds
     * @returns {Promise<BTT.SNDBSA>}
     */
    public searchRange(range: IRange): Promise<BTT.SNDBSA> {
        return new Promise<BTT.SNDBSA>((resolve) => {
            resolve(this.avl.tree.query(range));
        });
    }
}
