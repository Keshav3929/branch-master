import { TextField as MuiTextField } from "@mui/material";
import type { ChangeEvent, FocusEvent } from "react";

interface TextAreaProps {
    label: string;
    name: string;
    value: string;
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    onBlur?: (event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    error?: boolean;
    helperText?: string;
    rows?: number;
}

function TextArea({ label, name, value, onChange, onBlur, error = false, helperText, rows = 3 }: TextAreaProps) {
    return (
        <MuiTextField
            fullWidth
            multiline
            minRows={rows}
            margin="normal"
            label={label}
            name={name}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            error={error}
            helperText={helperText}
        />
    );
}

export default TextArea;