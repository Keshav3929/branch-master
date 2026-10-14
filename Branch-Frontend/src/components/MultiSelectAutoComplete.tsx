import type { ReactNode, KeyboardEvent } from "react";
import { Autocomplete as MuiAutocomplete, TextField as MuiTextField, Chip } from "@mui/material";

export type AutoCompleteOption = { id: number | string; name: string } | string | number;
export type AutoCompleteValue = AutoCompleteOption | AutoCompleteOption[] | null;

interface MultiSelectAutoCompleteProps {
    label: string;
    options: AutoCompleteOption[];
    value: AutoCompleteValue;
    onChange: (value: AutoCompleteValue) => void;
    onFocus?: () => void;
    onBlur?: () => void;
    multiple?: boolean;
    freeSolo?: boolean;
    disableClearable?: boolean;
    disableSuggestions?: boolean;
    error?: boolean;
    helperText?: ReactNode;
    fullWidth?: boolean;
    size?: "small" | "medium";
    placeholder?: string;
    endAdornment?: ReactNode;
    inputValue?: string;
    onInputChange?: (value: string) => void;
    onKeyDown?: (event: KeyboardEvent) => void;
}

export default function MultiSelectAutoComplete({
    label, options, value, onChange, multiple = false, freeSolo = false,
    disableClearable = false, disableSuggestions = false, error = false,
    helperText, fullWidth = true, size = "small", placeholder, endAdornment,
    inputValue, onInputChange, onKeyDown, onFocus, onBlur
}: MultiSelectAutoCompleteProps) {
    const getOptionLabel = (option: AutoCompleteOption) =>
        typeof option === "object" ? option.name : String(option);

    const isOptionEqualToValue = (option: AutoCompleteOption, val: AutoCompleteOption) =>
        typeof option === "object" && typeof val === "object"
            ? option.id === val.id
            : typeof option === "object" ? option.id === val
                : typeof val === "object" ? option === val.id : option === val;

    const selectedValue = (item: AutoCompleteOption | null) =>
        item == null ? null : options.find(option => isOptionEqualToValue(option, item)) ?? item;

    const normalizedValue = multiple
        ? (Array.isArray(value) ? value : value == null ? [] : [value])
            .map(item => selectedValue(item as AutoCompleteOption))
            .filter((item): item is AutoCompleteOption => item !== null)
        : selectedValue(Array.isArray(value) ? value[0] ?? null : value);

    return (
        <MuiAutocomplete
            multiple={multiple}
            freeSolo={freeSolo}
            disableClearable={disableClearable}
            open={disableSuggestions ? false : undefined}
            forcePopupIcon={disableSuggestions ? false : undefined}
            size={size}
            fullWidth={fullWidth}
            options={options}
            getOptionLabel={getOptionLabel}
            isOptionEqualToValue={isOptionEqualToValue}
            value={normalizedValue as never}
            onChange={(_, newValue) => onChange(newValue as AutoCompleteValue)}
            inputValue={inputValue}
            onInputChange={onInputChange ? (_, val) => onInputChange(val) : undefined}
            filterOptions={disableSuggestions ? options => options : undefined}
            renderValue={multiple ? (selected, getItemProps) =>
                (Array.isArray(selected) ? selected : [selected]).map((option, index) => (
                    <Chip {...getItemProps({ index })} key={index}
                        label={getOptionLabel(option)} size="small" />
                )) : undefined}
            renderInput={params => (
                <MuiTextField
                    {...params}
                    label={label}
                    placeholder={placeholder}
                    error={error}
                    helperText={helperText}
                    onKeyDown={onKeyDown}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    InputProps={{
                        ...params.InputProps,
                        ...(endAdornment ? {
                            endAdornment: <>{endAdornment}{params.InputProps.endAdornment}</>
                        } : {})
                    }}
                />
            )}
        />
    );
}