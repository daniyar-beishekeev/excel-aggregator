import { createContext, useContext } from "react";
import {useLocalStorage} from "../utils/persistentState.ts";

type GlobalContextType = {
    lang: string;
    setLang: (lang: string) => void;
};
const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export const GlobalProvider = ({ children }: {children: any}) => {
    const [lang, setLang] = useLocalStorage("lang", "ru");

    return (
        <GlobalContext.Provider value={{
            lang, setLang
        }}>
            {children}
        </GlobalContext.Provider>
    );
};

export const useGlobal = () => {
    const context = useContext(GlobalContext);
    if(!context)
        throw new Error("useGlobal must be used within GlobalProvider");
    return context;
};
