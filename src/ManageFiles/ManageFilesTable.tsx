import type {FileHolder} from "./FileHolder.ts";
import {Button, ButtonGroup, Col, Dropdown, DropdownButton, Form, Row, Stack} from "react-bootstrap";
import React, {useState, useMemo, useEffect} from "react";
import {useTranslation} from "react-i18next";
import {useLocalStorage} from "../utils/persistentState.ts";
import {useGlobal} from "../global/GlobalContext.tsx";
import {debounce} from "lodash";
import {formatDate} from "../utils/formatDate.ts"

const color_scheme: Record<string, string> = {
    processing: '#3182ce',
    ready: '#38a169',
    error: '#e53e3e',
};

const formatKB = (size?: number): string => size ? `${(size / 1024).toFixed(2)} KB` : '';

interface rowResolver {
    row: FileHolder,
    lang?: string
}
interface rowType {
    column: string;
    format: (ctx: rowResolver) => any;
    raw?: (ctx: rowResolver) => any;
}

const columns: rowType[] = [
    {
        column: 'id',
        format: (ctx): string => ctx.row.id
    },
    {
        column: 'uploadOrder',
        format: (ctx) => ctx.row.uploadOrder
    },
    {
        column: 'name',
        format: (ctx) => (<code className="font-mono text-blue-700">{ctx.row.file?.name ?? ''}</code>),
        raw: (ctx) => ctx.row.file?.name
    },
    {
        column: 'size',
        format: (ctx) => formatKB(ctx.row.file?.size),
        raw: (ctx) => ctx.row.file?.size
    },
    {
        column: 'status',
        format: (ctx) => (
            <span
                title={ctx.row.error}
                style={{
                    color: color_scheme[ctx.row.status] || 'gray',
                    fontWeight: 600,
                    cursor: ctx.row.error ? 'help' : 'default',
                }}
            >{ctx.row.status}</span>
        ),
        raw: (ctx) => ctx.row.status
    },
    {
        column: 'modified_date',
        format: (ctx) => formatDate({d: ctx.row.props?.ModifiedDate, lang: ctx.lang}),
        raw: (ctx) => ctx.row.props?.ModifiedDate
    },
    {
        column: 'app',
        format: (ctx) =>
            [ctx.row.props?.Application, ctx.row.props?.AppVersion]
                .filter(Boolean)
                .join(' ')
    },
    {
        column: 'sheets',
        format: (ctx) => (
            <span title={ctx.row.sheetNames.join(', ')}>
                {ctx.row.sheetNames.length}
            </span>
        ),
        raw: (ctx) => ctx.row.sheetNames.length
    },
    {
        column: 'last_author',
        format: (ctx) => (ctx.row.props?.LastAuthor || ctx.row.props?.Author) ?? ''
    },
    {
        column: 'created_date',
        format: (ctx) => formatDate({d: ctx.row.props?.CreatedDate, lang: ctx.lang}),
        raw: (ctx) => ctx.row.props?.CreatedDate
    },
    {
        column: 'keywords',
        format: (ctx) => ctx.row.props?.Keywords ?? '',
    },
    {
        column: 'identifier',
        format: (ctx) => ctx.row.props?.Identifier ?? '',
    },
    {
        column: 'version',
        format: (ctx) => ctx.row.props?.Version ?? '',
    },
    {
        column: 'language',
        format: (ctx) => ctx.row.props?.Language ?? '',
    },
    {
        column: 'title',
        format: (ctx) => ctx.row.props?.Title ?? '',
    },
    {
        column: 'subject',
        format: (ctx) => ctx.row.props?.Subject ?? '',
    },
    {
        column: 'author',
        format: (ctx) => ctx.row.props?.Author ?? '',
    },
    {
        column: 'manager',
        format: (ctx) => ctx.row.props?.Manager ?? '',
    },
    {
        column: 'company',
        format: (ctx) => ctx.row.props?.Company ?? '',
    },
    {
        column: 'category',
        format: (ctx) => ctx.row.props?.Category ?? '',
    },
    {
        column: 'comments',
        format: (ctx) => ctx.row.props?.Comments ?? '',
    },
]

const defaultSorter = 'uploadOrder';
type ManageFilesProps = {children?: any, files: FileHolder[], setFiles: React.Dispatch<React.SetStateAction<FileHolder[]>>};
export function ManageFilesTable({children, files, setFiles}: ManageFilesProps) {
    const {t} = useTranslation();
    const {lang} = useGlobal();
    const [query, setQuery] = useState<string>('');
    const [sortKey, setSortKey] = useState<string>(defaultSorter);
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
    const [visibleCols, setVisibleCols] = useLocalStorage<Record<string, boolean>>(
        'manage_files_columns',
        () => Object.fromEntries(columns.map(c => [c.column, true]))
    );
    const [selected, setSelected] = useState<Set<string>>(new Set());

    const toggleSort = (col: string) => {
        if (sortKey === col) {
            if (sortDir === 'asc')
                setSortDir('desc');
            else {
                setSortDir('asc');
                setSortKey(defaultSorter);
            }
        } else {
            setSortKey(col);
            setSortDir('asc');
        }
    };

    const toggleRow = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleAll = (rows: FileHolder[]) => {
        setSelected(prev => {
            const allSelected = rows.every(r => prev.has(r.id));
            const next = new Set(prev);
            if (allSelected)
                rows.forEach(r => next.delete(r.id));
            else
                rows.forEach(r => next.add(r.id));
            return next;
        });
    };
    const [filterQuery, setFilterQuery] = useState<string>('');
    const debouncedSetFilterQuery = useMemo(
      () =>
        debounce((value: string) => {
            setFilterQuery(value);
        }, 500),
      []
    );
    useEffect(() => {
        debouncedSetFilterQuery(query);
        return () => {
            debouncedSetFilterQuery.cancel();
        };
    }, [query, debouncedSetFilterQuery]);
    const filtered = useMemo(() => {
        const q = filterQuery.toLowerCase().trim();
        if (!q || q === '') return files;
        return files.filter(f =>
            columns.some(c =>
                visibleCols[c.column] && String((c.raw ?? c.format)({row: f, lang}) ?? '').toLowerCase().includes(q)
            )
        );
    }, [files, filterQuery, visibleCols]);

    const sorted = useMemo(() => {
        if (sortKey === defaultSorter) return filtered;
        const col = columns.find(c => c.column === sortKey);
        if (!col) return filtered;
        const resolver = col.raw ?? col.format;

        return [...filtered].sort((a, b) => {
            const va = resolver({row: a});
            const vb = resolver({row: b});
            const A = va instanceof Date ? va.getTime() : String(va ?? '');
            const B = vb instanceof Date ? vb.getTime() : String(vb ?? '');
            return A < B ? -1 : 1;
        });
    }, [filtered, sortKey]);

    const summary = useMemo(() => {
        const arr = files.map(row => row.status);
        const freq = arr.reduce<Record<string, number>>((acc, item) => {
            acc[item] = (acc[item] || 0) + 1;
            return acc;
        }, {});
        const ans = Object.entries(freq);
        if (ans.length < 2) return '';
        return ans.map(([key, count]) => `${t(key)} - ${count}`).join(', ');
    }, [files]);

    const visibleColumns = columns.slice(2).filter(c => visibleCols[c.column]);

    const removeSelected = (other: boolean = false) => {
        setFiles(files.filter(f => other === selected.has(f.id)));
        setSelected(new Set());
    };

    return (
        <Stack gap={2} className={"mt-1"}>
            <Row className="align-items-center">
                <Col className="text-start d-flex gap-2">
                    {children}
                    <span>{summary}</span>
                </Col>

                <Col className="text-end d-flex gap-2 justify-content-end">
                    <input
                        className="form-control form-control-sm"
                        placeholder={t('search') + '...'}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        style={{ maxWidth: 200 }}
                    />

                    <Dropdown align="end">
                        <Dropdown.Toggle size="sm" variant="outline-secondary">{t('columns')}</Dropdown.Toggle>
                        <Dropdown.Menu
                            renderOnMount
                            popperConfig={{
                                strategy: "fixed"
                            }}
                            style={{ minWidth: 220, zIndex: 2000 }}
                        >
                            <div className="px-2 py-1">
                                {columns.slice(2).map(c => (
                                    <Form.Check
                                        key={c.column}
                                        type="checkbox"
                                        label={t(c.column)}
                                        checked={visibleCols[c.column]}
                                        disabled={c.column === 'name'}
                                        onChange={() =>
                                            setVisibleCols(v => ({
                                                ...v,
                                                [c.column]: !v[c.column],
                                            }))
                                        }
                                        className="mb-1"
                                    />
                                ))}
                            </div>
                        </Dropdown.Menu>
                    </Dropdown>

                    <ButtonGroup size="sm">
                        <Button
                            variant="danger"
                            disabled={selected.size === 0}
                            onClick={() => removeSelected()}
                        >
                            {t('remove')} ({selected.size})
                        </Button>

                        <DropdownButton
                            title={null}
                            as={ButtonGroup}
                            variant="danger"
                            size="sm"
                            id="dropdown-split"
                            disabled={selected.size === 0}
                        >
                            <Dropdown.Item className="text-danger" onClick={() => removeSelected(true)}>
                                {t('remove_others')} ({files.length - selected.size})
                            </Dropdown.Item>
                        </DropdownButton>
                    </ButtonGroup>
                </Col>
            </Row>
            <table className="table table-sm table-hover">
                <thead style={{position: 'sticky', top: 0}}>
                <tr>
                    <th>
                        <input
                            type="checkbox"
                            checked={
                                filtered.length > 0 &&
                                filtered.every(r => selected.has(r.id))
                            }
                            onChange={() => toggleAll(filtered)}
                        />
                    </th>

                    {visibleColumns.map(col => (
                        <th
                            key={col.column}
                            style={{ cursor: 'pointer', userSelect: 'none' }}
                            onClick={() => toggleSort(col.column)}
                        >
                            {t(col.column)}
                            {sortKey === col.column ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                        </th>
                    ))}
                </tr>
                </thead>

                <tbody>
                {(sortDir === 'asc' ? sorted : sorted.reverse()).map(row => (
                    <tr key={row.id}>
                        <td>
                            <input
                                type="checkbox"
                                checked={selected.has(row.id)}
                                onChange={() => toggleRow(row.id)}
                            />
                        </td>

                        {visibleColumns.map(col => (
                            <td key={col.column}>
                                {col.format({row, lang})}
                            </td>
                        ))}
                    </tr>
                ))}
                </tbody>
            </table>
        </Stack>
    );
}
