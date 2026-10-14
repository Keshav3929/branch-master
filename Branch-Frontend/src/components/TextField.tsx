import { TextField as MuiTextField } from "@mui/material";
import type { ChangeEvent, FocusEvent } from "react";

interface TextFieldProps {
    label: string;
    name: string;
    value: string;
    type?: string;
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    onBlur?: (event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    error?: boolean;
    helperText?: string;
}

function TextField({ label, name, value, type, onChange, onBlur, error = false, helperText }: TextFieldProps) {
    return (
        <MuiTextField
            fullWidth
            margin="normal"
            label={label}
            name={name}
            type={type}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            error={error}
            helperText={helperText}
        />
    );
}

export default TextField;