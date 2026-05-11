import {createContext, type ReactNode, useContext, useEffect} from "react";
import {useLocalStorage} from "../utils/persistentState.ts";
import i18n from "i18next";
import {type MenuCallback, type MenuEntry, useContextMenu} from "../ContextMenu.tsx";

type GlobalContextType = {
    lang: string;
    setLang: (lang: string) => void;
    contextMenuContent: ReactNode;
    openContextMenu: (e: Pick<MouseEvent, "clientX" | "clientY">, items: MenuEntry[], cb?: MenuCallback) => void;
};
const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export const GlobalProvider = ({ children }: {children: any}) => {
    const [lang, setLang] = useLocalStorage("lang", "ru");
    useEffect(() => {
        i18n.changeLanguage(lang).catch(console.error);
    }, [lang]);

    const [contextMenuContent, openContextMenu] = useContextMenu();

    return (
        <GlobalContext.Provider value={{
            lang, setLang, contextMenuContent, openContextMenu
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
