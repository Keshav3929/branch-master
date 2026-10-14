import { Button } from "@mui/material";
import type { ChangeEvent } from "react";

interface AttachmentProps {
    label: string;
    onChange: (event: ChangeEvent<HTMLInputElement>) => void;
    accept?: string;
}

function Attachment({
    label,
    onChange,
    accept
}: AttachmentProps) {
    return (
        <Button
            variant="outlined"
            component="label"
        >
            {label}

            <input
                type="file"
                hidden
                accept={accept}
                onChange={onChange}
            />
        </Button>
    );
}

export default Attachment;