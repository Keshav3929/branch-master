import type { ChangeEvent, FocusEvent, ReactNode } from "react";
import { Box, Card, CardContent, Paper, Stack, Typography } from "@mui/material";
import BusinessIcon from "@mui/icons-material/Business";
import LocationIcon from "@mui/icons-material/LocationOn";
import ContactIcon from "@mui/icons-material/ContactPhone";
import SettingsIcon from "@mui/icons-material/Settings";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import TextField from "./TextField";
import TextArea from "./TextArea";
import Attachment from "./Attachment";
import MultiSelectAutoComplete from "./MultiSelectAutoComplete";
import { showError } from "./SweetAlert";
import { splitCsv, joinCsv, pickId, gridStyle, type OptionItem, type OptionsData} from "../app/branchUtils";

// kinds: text | num (numeric id) | str (id kept as string) | pick (plain string) | multi (comma-separated) | status
type Kind = "text" | "num" | "str" | "pick" | "multi" | "status";
type Field = readonly [kind: Kind, key: string, label: string, source?: keyof OptionsData | string[]];

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SECTIONS: { title: string; sub: string; icon: ReactNode; pre?: Field; fields: Field[] }[] = [
    {
        title: "General Details", sub: "Branch identity and organization", icon: <BusinessIcon />, fields: [
            ["text", "branchCode", "Branch Code*"], ["text", "branchName", "Branch Name*"], ["text", "communicationName", "Communication Name"],
            ["num", "organizationId", "Organization*", "organizations"], ["pick", "branchType", "Branch Type*", "branchTypes"]]
    },
    {
        title: "Location & Address", sub: "Geographical details and branch address", icon: <LocationIcon />, fields: [
            ["num", "regionId", "Region*", "regions"], ["num", "countryId", "Country*", "countries"],
            ["num", "stateId", "State*", "states"], ["num", "cityId", "City*", "cities"],
            ["text", "area", "Area"], ["text", "zipCode", "Zip Code"], ["text", "latitude", "Latitude"], ["text", "longitude", "Longitude"],
            ["text", "address1", "Address Line 1*"], ["text", "address2", "Address Line 2"]]
    },
    {
        title: "Contact Information", sub: "Contact details for this branch", icon: <ContactIcon />, fields: [
            ["str", "contactPerson", "Contact Person", "contactPersons"], ["text", "mobile", "Mobile"],
            ["text", "telephone", "Telephone"], ["text", "email", "Email"]]
    },
    {
        title: "Operations & Services", sub: "Working schedule, departments and status", icon: <SettingsIcon />,
        pre: ["multi", "workingDays", "Select Working Days", DAYS], fields: [
            ["str", "workingHoursId", "Working Hours", "workingHours"],
            ["multi", "departmentIds", "Departments", ["HR", "Finance", "IT", "Sales"]],
            ["multi", "serviceIds", "Services", ["OPD", "Emergency", "Pharmacy", "Laboratory"]],
            ["status", "status", "Status*"]]
    }
];

const ATTACHMENTS = [
    { key: "branchLogo", label: "Branch Logo", accept: ".jpg,.jpeg,.png", hint: "JPG, PNG · Maximum 5 MB", max: 5 },
    { key: "documentPath", label: "Supporting Document", accept: ".pdf,.doc,.docx,.xls,.xlsx", hint: "PDF, DOC, DOCX, XLS, XLSX · Maximum 20 MB", max: 20 }
] as const;

interface Props {
    data: object;                                           // current form values
    set: (patch: Record<string, unknown>) => void;          // writes values
    errOf: (name: string) => string | undefined;
    onBlur?: (e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    optionsData: OptionsData;
    prefix?: string;                                        // "branches.0." in the batch form
    stars?: boolean;                                        // false: only Status keeps its "*" (edit form)
    emptyId?: number | null;                                // value stored when a numeric dropdown is cleared
}

export default function BranchFormFields({ data, set, errOf, onBlur, optionsData: opt, prefix = "", stars = true, emptyId = null }: Props) {
    const d = data as Record<string, unknown>;

    const field = ([kind, key, label, source]: Field) => {
        const msg = errOf(key);
        const common = { label: stars || key === "status" ? label : label.replace(/\*$/, ""), error: !!msg, helperText: msg };
        const v = d[key];
        const list = (typeof source === "string" ? opt[source] : source ?? []);

        switch (kind) {
            case "text":
                return <TextField key={key} {...common} name={prefix + key} value={String(v ?? "")}
                    onChange={e => set({ [key]: e.target.value })} onBlur={onBlur} />;
            case "num":
                return <MultiSelectAutoComplete key={key} {...common} options={list as OptionItem[]}
                    value={(list as OptionItem[]).find(o => v != null && Number(o.id) === Number(v)) ?? null}
                    onChange={x => set({ [key]: pickId(x) ?? emptyId })} />;
            case "str":
                return <MultiSelectAutoComplete key={key} {...common} options={list as OptionItem[]}
                    value={(list as OptionItem[]).find(o => String(o.id) === v) ?? null}
                    onChange={x => set({ [key]: pickId(x)?.toString() ?? "" })} />;
            case "pick":
                return <MultiSelectAutoComplete key={key} {...common} options={list as string[]}
                    value={(v as string) || null} onChange={x => set({ [key]: typeof x === "string" ? x : "" })} />;
            case "multi":
                return <MultiSelectAutoComplete key={key} {...common} multiple options={list as string[]}
                    value={splitCsv(v as string)} onChange={x => set({ [key]: joinCsv(x) })} />;
            default:
                return <MultiSelectAutoComplete key={key} {...common} options={["Active", "Inactive"]}
                    value={v ? "Active" : "Inactive"} onChange={x => set({ status: x === "Active" })} />;
        }
    };

    const attach = async (key: "branchLogo" | "documentPath", max: number, e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > max * 1024 * 1024) {
            await showError("File Too Large", `File size must not exceed ${max} MB.`);
        } else {
            set({ [key]: file.name });
        }
        e.target.value = "";
    };

    const card = (n: number, title: string, sub: string, icon: ReactNode, body: ReactNode) => (
        <Card key={title} variant="outlined" sx={{ mb: 2.5, borderRadius: 3, borderColor: "divider", overflow: "visible" }}>
            <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2.5 }}>
                    <Box sx={{ width: 42, height: 42, borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "primary.main", color: "primary.contrastText", flexShrink: 0 }}>{icon}</Box>
                    <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{String(n).padStart(2, "0")}. {title}</Typography>
                        <Typography variant="body2" color="text.secondary">{sub}</Typography>
                    </Box>
                </Stack>
                {body}
            </CardContent>
        </Card>
    );

    return (
        <>
            {SECTIONS.map((s, i) => card(i + 1, s.title, s.sub, s.icon, <>
                {s.pre && (
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2.5 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>Working Days</Typography>
                        {field(s.pre)}
                    </Paper>
                )}
                <Box sx={gridStyle}>{s.fields.map(field)}</Box>
            </>))}

            {card(5, "Documents & Remarks", "Optional supporting files and additional notes", <AttachFileIcon />, <>
                <TextArea label="Remarks" name={`${prefix}remarks`} value={(d.remarks as string) || ""} onChange={e => set({ remarks: e.target.value })} />
                <Box sx={{ ...gridStyle, mt: 2.5 }}>
                    {ATTACHMENTS.map(a => (
                        <Paper variant="outlined" key={a.key} sx={{ p: 2, borderRadius: 2, borderStyle: "dashed", bgcolor: "action.hover" }}>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                                <AttachFileIcon color="primary" fontSize="small" />
                                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{a.label}</Typography>
                            </Stack>
                            <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: "block" }}>{a.hint}</Typography>
                            <Attachment label="Choose File" accept={a.accept} onChange={e => attach(a.key, a.max, e)} />
                            <Typography variant="body2" sx={{ mt: 1.5, overflowWrap: "anywhere" }} color={d[a.key] ? "text.primary" : "text.secondary"}>
                                {(d[a.key] as string) || "No file selected"}
                            </Typography>
                        </Paper>
                    ))}
                </Box>
            </>)}
        </>
    );
}