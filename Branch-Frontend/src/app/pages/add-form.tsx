
import { useState } from "react";
import type { FocusEvent, ReactNode, ChangeEvent } from "react";
import { Button, Box, Typography, Card, CardContent, Paper, Chip, Stack, IconButton, Tooltip, Divider } from "@mui/material";
import BusinessIcon from "@mui/icons-material/Business";
import LocationIcon from "@mui/icons-material/LocationOn";
import ContactIcon from "@mui/icons-material/ContactPhone";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import ResetIcon from "@mui/icons-material/RestartAlt";
import SaveIcon from "@mui/icons-material/Save";
import SettingsIcon from "@mui/icons-material/Settings";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { isAxiosError } from "axios";
import * as yup from "yup";
import { useForm, useFieldArray } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import Drawer from "../../components/Drawer";
import TextField from "../../components/TextField";
import TextArea from "../../components/TextArea";
import Attachment from "../../components/Attachment";
import MultiSelectAutoComplete from "../../components/MultiSelectAutoComplete";
import { showSuccess, showError } from "../../components/SweetAlert";
import branchSchema from "../branch-validation";
import { saveBranches } from "../branchApi";
import { splitCsv, toPayload } from "../branchUtils";

interface OptionItem { id: number | string; name: string }
interface OptionsData {
    organizations: OptionItem[]; branchTypes: string[]; regions: OptionItem[]; countries: OptionItem[];
    states: OptionItem[]; cities: OptionItem[]; contactPersons: OptionItem[]; workingHours: OptionItem[];
}
interface AddFormProps { open: boolean; onClose: () => void; onSuccess: () => void; optionsData: OptionsData }

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DEPARTMENTS = ["HR", "Finance", "IT", "Sales"];
const SERVICES = ["OPD", "Emergency", "Pharmacy", "Laboratory"];

const initialForm = {
    branchCode: "", branchName: "", communicationName: "", branchType: "",
    organizationId: null as number | null, regionId: null as number | null, countryId: null as number | null,
    stateId: null as number | null, cityId: null as number | null,
    area: "", zipCode: "", address1: "", address2: "", latitude: "", longitude: "",
    contactPerson: "", mobile: "", telephone: "", email: "",
    workingDays: "", workingHoursId: "", departmentIds: "", serviceIds: "",
    status: true, branchLogo: "", documentPath: "", remarks: ""
};

type FormValues = typeof initialForm;
type BatchValues = { branches: FormValues[] };

const batchSchema = yup.object({
    branches: yup.array().of(branchSchema).min(1, "Add at least one branch").required()
});

const sectionStyle = { mb: 2.5, borderRadius: 3, borderColor: "divider", overflow: "visible" };
const gridStyle = { display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" }, gap: 2 };

const getErrorMessage = (err: unknown, fallback: string): string => {
    if (!isAxiosError(err)) return fallback;
    const d = err.response?.data;
    if (typeof d === "string" && d.trim()) return d;
    return d?.message || d?.error || d?.detail || fallback;
};

export default function AddForm({ open, onClose, onSuccess, optionsData }: AddFormProps) {
    const [formData, setFormData] = useState<FormValues[]>([{ ...initialForm }]);

    const { control, setValue, trigger, handleSubmit, reset, formState: { errors, isSubmitting } } =
        useForm<BatchValues>({
            defaultValues: { branches: [{ ...initialForm }] },
            resolver: yupResolver(batchSchema) as Resolver<BatchValues>,
            mode: "onBlur"
        });

    const { fields, append, remove } = useFieldArray({ control, name: "branches" });

    type BranchField = keyof FormValues;
    type BranchFieldPath = `branches.${number}.${BranchField}`;

    const set = (index: number, patch: Partial<FormValues>) => {
        setFormData(prev => prev.map((item, i) => i === index ? { ...item, ...patch } : item));
        Object.entries(patch).forEach(([key, value]) =>
            setValue(`branches.${index}.${key as BranchField}` as BranchFieldPath, value as never, {
                shouldDirty: true, shouldValidate: true
            }));
    };

    const handleBlur = (index: number, e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const name = e.target.name.split(".").pop() as BranchField;
        void trigger(`branches.${index}.${name}` as BranchFieldPath);
    };

    const handleAttachment = (index: number, event: ChangeEvent<HTMLInputElement>, key: "branchLogo" | "documentPath", maxSize: number) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (file.size > maxSize * 1024 * 1024) {
            void showError("File Too Large", `File size must not exceed ${maxSize} MB.`);
            event.target.value = "";
            return;
        }
        set(index, { [key]: file.name });
    };

    const handleReset = () => {
        const blank = [{ ...initialForm }];
        setFormData(blank);
        reset({ branches: blank });
    };

    const closeForm = () => {
        handleReset();
        onClose();
    };

    const handleSave = handleSubmit(async ({ branches }) => {
        try {
            const res = await saveBranches(branches.map(toPayload));
            const count = branches.length;
            handleReset();
            onClose();
            onSuccess();
            await showSuccess("Success!", res.data?.message || `${count} branches created successfully.`);
        } catch (err: unknown) {
            await showError("Error!", getErrorMessage(err, "Failed to create branches."));
        }
    });

    const pickId = (value: unknown): number | null => {
        if (value == null || Array.isArray(value)) return null;
        if (typeof value === "object" && "id" in value) return Number(value.id);
        return null;
    };

    const sectionHeader = (number: string, title: string, subtitle: string, icon: ReactNode) => (
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2.5 }}>
            <Box sx={{ width: 42, height: 42, borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "primary.main", color: "primary.contrastText", flexShrink: 0 }}>{icon}</Box>
            <Box>
                <Typography variant="subtitle1" fontWeight={700}>{number}. {title}</Typography>
                <Typography variant="body2" color="text.secondary">{subtitle}</Typography>
            </Box>
        </Stack>
    );

    const text = (index: number, label: string, name: keyof FormValues & string) => {
        const error = (errors.branches?.[index] as any)?.[name]; 
        return (
            <TextField label={label} name={`branches.${index}.${name}`} value={String(formData[index]?.[name] ?? "")} onChange={e => set(index, { [name]: e.target.value } as Partial<FormValues>)} onBlur={e => handleBlur(index, e)} error={!!error} helperText={error?.message as string} />
        );
    };

    return (
        <Drawer
            open={open}
            onClose={closeForm}
            title={
                <Box sx={{ bgcolor: "#0f172a", color: "#fff", width: "100%", p: 2, borderRadius: 2 }}>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                        <BusinessIcon sx={{ fontSize: 30 }} />
                        <Box>
                            <Typography variant="h6" fontWeight={700}>Create Branches</Typography>
                            <Typography variant="body2" sx={{ opacity: 0.85 }}>Add one or multiple branches using the forms below.</Typography>
                        </Box>
                    </Stack>
                    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap", mt: 1.5 }}>
                        {["General details", "Location", "Operations"].map(label => (
                            <Chip key={label} size="small" label={label} sx={{ bgcolor: "rgba(255,255,255,.16)", color: "#fff", border: "1px solid rgba(255,255,255,.3)" }} />
                        ))}
                    </Stack>
                </Box>
            }
            footer={
                <Stack direction="row" spacing={1} justifyContent="center" sx={{ width: "100%", flexWrap: "wrap" }}>
                    <Button variant="contained" color="success" startIcon={<SaveIcon />} onClick={handleSave} disabled={isSubmitting}>
                        {isSubmitting ? "Saving..." : `Save All (${fields.length})`}
                    </Button>
                    <Button variant="contained" color="warning" startIcon={<ResetIcon />} onClick={handleReset} disabled={isSubmitting}>Reset</Button>
                    <Button variant="contained" color="error" onClick={closeForm} disabled={isSubmitting}>Cancel</Button>
                </Stack>
            }
        >
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={700}>Branch entries ({fields.length})</Typography>
                <Button startIcon={<AddIcon />} variant="outlined" onClick={() => {
                    append({ ...initialForm });
                    setFormData(prev => [...prev, { ...initialForm }]);
                }} disabled={isSubmitting}>Add More</Button>
            </Stack>

            {fields.map((field, index) => {
                const data = formData[index] ?? initialForm;
                const setField = (patch: Partial<FormValues>) => set(index, patch);
                const selectedDays = splitCsv(data.workingDays);

                return (
                    <Box key={field.id} sx={{ mb: 3 }}>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                            <Typography variant="h6" fontWeight={700}>Branch {index + 1}</Typography>
                            {fields.length > 1 && (
                                <Tooltip title="Remove this branch">
                                    <IconButton color="error" onClick={() => {
                                        remove(index);
                                        setFormData(prev => prev.filter((_, i) => i !== index));
                                    }} disabled={isSubmitting}><DeleteOutlineIcon /></IconButton>
                                </Tooltip>
                            )}
                        </Stack>

                        <Card variant="outlined" sx={sectionStyle}>
                            <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
                                {sectionHeader("01", "General Details", "Branch identity and organization", <BusinessIcon />)}
                                <Box sx={gridStyle}>
                                    {text(index, "Branch Code*", "branchCode")}
                                    {text(index, "Branch Name*", "branchName")}
                                    {text(index, "Communication Name", "communicationName")}
                                    <MultiSelectAutoComplete label="Organization*" options={optionsData.organizations} value={optionsData.organizations.find(o => Number(o.id) === data.organizationId) ?? null} onChange={value => setField({ organizationId: pickId(value) })} error={!!(errors.branches?.[index] as any)?.organizationId} helperText={(errors.branches?.[index] as any)?.organizationId?.message} />
                                    <MultiSelectAutoComplete label="Branch Type*" options={optionsData.branchTypes} value={data.branchType || null} onChange={value => setField({ branchType: typeof value === "string" ? value : "" })} error={!!(errors.branches?.[index] as any)?.branchType} helperText={(errors.branches?.[index] as any)?.branchType?.message} />
                                    <MultiSelectAutoComplete label="Working Hours" options={optionsData.workingHours} value={optionsData.workingHours.find(o => String(o.id) === data.workingHoursId) ?? null} onChange={value => setField({ workingHoursId: pickId(value)?.toString() ?? "" })} />
                                </Box>
                            </CardContent>
                        </Card>

                        <Card variant="outlined" sx={sectionStyle}>
                            <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
                                {sectionHeader("02", "Location & Address", "Geographical details and branch address", <LocationIcon />)}
                                <Box sx={gridStyle}>
                                    <MultiSelectAutoComplete label="Region*" options={optionsData.regions} value={optionsData.regions.find(o => Number(o.id) === data.regionId) ?? null} onChange={value => setField({ regionId: pickId(value) })} error={!!(errors.branches?.[index] as any)?.regionId} helperText={(errors.branches?.[index] as any)?.regionId?.message} />
                                    <MultiSelectAutoComplete label="Country*" options={optionsData.countries} value={optionsData.countries.find(o => Number(o.id) === data.countryId) ?? null} onChange={value => setField({ countryId: pickId(value) })} error={!!(errors.branches?.[index] as any)?.countryId} helperText={(errors.branches?.[index] as any)?.countryId?.message} />
                                    <MultiSelectAutoComplete label="State*" options={optionsData.states} value={optionsData.states.find(o => Number(o.id) === data.stateId) ?? null} onChange={value => setField({ stateId: pickId(value) })} error={!!(errors.branches?.[index] as any)?.stateId} helperText={(errors.branches?.[index] as any)?.stateId?.message} />
                                    <MultiSelectAutoComplete label="City*" options={optionsData.cities} value={optionsData.cities.find(o => Number(o.id) === data.cityId) ?? null} onChange={value => setField({ cityId: pickId(value) })} error={!!(errors.branches?.[index] as any)?.cityId} helperText={(errors.branches?.[index] as any)?.cityId?.message} />
                                    {text(index, "Area", "area")}
                                    {text(index, "Zip Code", "zipCode")}
                                    {text(index, "Latitude", "latitude")}
                                    {text(index, "Longitude", "longitude")}
                                    {text(index, "Address Line 1*", "address1")}
                                    {text(index, "Address Line 2", "address2")}
                                </Box>
                            </CardContent>
                        </Card>

                        <Card variant="outlined" sx={sectionStyle}>
                            <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
                                {sectionHeader("03", "Contact Information", "Contact details for this branch", <ContactIcon />)}
                                <Box sx={gridStyle}>
                                    <MultiSelectAutoComplete label="Contact Person" options={optionsData.contactPersons} value={optionsData.contactPersons.find(o => String(o.id) === data.contactPerson) ?? null} onChange={value => setField({ contactPerson: pickId(value)?.toString() ?? "" })} />
                                    {text(index, "Mobile", "mobile")}
                                    {text(index, "Telephone", "telephone")}
                                    {text(index, "Email", "email")}
                                </Box>
                            </CardContent>
                        </Card>

                        <Card variant="outlined" sx={sectionStyle}>
                            <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
                                {sectionHeader("04", "Operations & Services", "Working schedule, departments and status", <SettingsIcon />)}
                                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2.5 }}>
                                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Working Days</Typography>
                                    <MultiSelectAutoComplete multiple label="Select Working Days" options={DAYS} value={selectedDays} onChange={value => setField({ workingDays: (Array.isArray(value) ? value : value == null ? [] : [value]).map(String).join(",") })} />
                                </Paper>
                                <Box sx={gridStyle}>
                                    <MultiSelectAutoComplete multiple label="Departments" options={DEPARTMENTS} value={splitCsv(data.departmentIds)} onChange={value => setField({ departmentIds: (Array.isArray(value) ? value : value == null ? [] : [value]).map(String).join(",") })} />
                                    <MultiSelectAutoComplete multiple label="Services" options={SERVICES} value={splitCsv(data.serviceIds)} onChange={value => setField({ serviceIds: (Array.isArray(value) ? value : value == null ? [] : [value]).map(String).join(",") })} />
                                    <MultiSelectAutoComplete label="Status*" options={["Active", "Inactive"]} value={data.status ? "Active" : "Inactive"} onChange={value => setField({ status: value === "Active" })} />
                                </Box>
                            </CardContent>
                        </Card>

                        <Card variant="outlined" sx={sectionStyle}>
                            <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
                                {sectionHeader("05", "Documents & Remarks", "Optional supporting files and additional notes", <AttachFileIcon />)}
                                <TextArea label="Remarks" name={`branches.${index}.remarks`} value={data.remarks} onChange={e => setField({ remarks: e.target.value })} />
                                <Box sx={{ ...gridStyle, mt: 2.5 }}>
                                    {[
                                        { key: "branchLogo" as const, label: "Branch Logo", accept: ".jpg,.jpeg,.png", hint: "JPG, PNG · Maximum 5 MB", maxSize: 5 },
                                        { key: "documentPath" as const, label: "Supporting Document", accept: ".pdf,.doc,.docx,.xls,.xlsx", hint: "PDF, DOC, DOCX, XLS, XLSX · Maximum 20 MB", maxSize: 20 }
                                    ].map(item => (
                                        <Paper variant="outlined" key={item.key} sx={{ p: 2, borderRadius: 2, borderStyle: "dashed", bgcolor: "action.hover" }}>
                                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                                                <AttachFileIcon color="primary" fontSize="small" />
                                                <Typography variant="subtitle2" fontWeight={700}>{item.label}</Typography>
                                            </Stack>
                                            <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: "block" }}>{item.hint}</Typography>
                                            <Attachment label="Choose File" accept={item.accept} onChange={event => handleAttachment(index, event, item.key, item.maxSize)} />
                                            <Typography variant="body2" sx={{ mt: 1.5, overflowWrap: "anywhere" }} color={data[item.key] ? "text.primary" : "text.secondary"}>
                                                {data[item.key] || "No file selected"}
                                            </Typography>
                                        </Paper>
                                    ))}
                                </Box>
                            </CardContent>
                        </Card>
                        {index < fields.length - 1 && <Divider sx={{ my: 3 }} />}
                    </Box>
                );
            })}
        </Drawer>
    );
}