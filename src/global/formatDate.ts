import * as locales from "date-fns/locale";
import {format} from "date-fns";

const getDateLocale = (lang: string) => {
  return lang in locales ? locales[lang as keyof typeof locales] : locales.enUS;
};
export const formatDate = ({d, lang}: {d?: Date | undefined, lang?: string | undefined}): string => d ? format(new Date(d), 'PPpp', {locale: getDateLocale(lang ?? '')}) : '';
