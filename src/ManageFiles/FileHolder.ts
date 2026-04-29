import type {FullProperties} from "xlsx";

export interface FileHolder {
    file: File,
    id: string;
    uploadOrder: number;
    status: string;
    error?: string;
    sheetNames: string[];
    props: FullProperties;
}
