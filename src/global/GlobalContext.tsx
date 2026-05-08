import {createContext, useContext, useEffect, useState} from "react";
import {useLocalStorage} from "../utils/persistentState.ts";
import i18n from "i18next";

type GlobalContextType = {
    lang: string;
    setLang: (lang: string) => void;
};
const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export const GlobalProvider = ({ children }: {children: any}) => {
    const [lang, setLang] = useLocalStorage("lang", "ru");
    useEffect(() => {
        i18n.changeLanguage(lang).catch(console.error);
    }, [lang]);

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
