import * as yup from "yup";

const requiredNumber = (label: string) =>
    yup.number()
        .nullable()
        .defined()
        .typeError(`${label} is mandatory`)
        .test("required", `${label} is mandatory`, (value) => value !== null);
        
const optionalCoordinate = (label: string, limit: number) =>
    yup.string()
        .defined()
        .test("coordinate", `${label} must be a number`, (v) => !v || !Number.isNaN(Number(v)))
        .test("range", `${label} must be between -${limit} and ${limit}`, (v) =>
            !v || (Number(v) >= -limit && Number(v) <= limit)
        );

const digitsOnly = (label: string) => ({
    message: `${label} must contain only numbers`,
    excludeEmptyString: true
});

const branchSchema = yup.object({
    branchCode: yup.string().trim().required("Branch code is mandatory")
        .max(20, "Branch code must not exceed 20 characters")
        .matches(/^[a-zA-Z0-9]+$/, {
            message: "Branch code must contain only letters and numbers",
            excludeEmptyString: true
        }),

    branchName: yup.string().trim().required("Branch name is mandatory")
        .max(200, "Branch name must not exceed 200 characters")
        .matches(/^[a-zA-Z0-9 ]+$/, {
            message: "Branch name must contain only letters, numbers, and spaces",
            excludeEmptyString: true
        }),

    communicationName: yup.string().trim().defined()
        .max(200, "Communication name must not exceed 200 characters"),

    organizationId: requiredNumber("Organization"),
    branchType: yup.string().trim().required("Branch type is mandatory"),
    regionId: requiredNumber("Region"),
    countryId: requiredNumber("Country"),
    stateId: requiredNumber("State"),
    cityId: requiredNumber("City"),

    area: yup.string().trim().defined().max(150, "Area must not exceed 150 characters"),

    zipCode: yup.string().trim().defined()
        .max(10, "Zip code must not exceed 10 characters")
        .matches(/^[0-9]*$/, digitsOnly("Zip code")),

    address1: yup.string().trim().required("Address is mandatory")
        .max(500, "Address must not exceed 500 characters"),

    address2: yup.string().trim().defined().max(500, "Address 2 must not exceed 500 characters"),

    latitude: optionalCoordinate("Latitude", 90),
    longitude: optionalCoordinate("Longitude", 180),

    contactPerson: yup.string().defined(),
    mobile: yup.string().trim().defined()
        .matches(/^[6-9][0-9]{9}$/, {
            message: "Mobile number must be 10 digits and start with 6, 7, 8, or 9",
            excludeEmptyString: true
        }),

    telephone: yup.string().trim().defined()
        .max(20, "Telephone must not exceed 20 characters")
        .matches(/^[0-9]*$/, digitsOnly("Telephone")),

    email: yup.string().trim().defined()
        .max(150, "Email must not exceed 150 characters")
        .email("Please provide a valid email address"),

    workingDays: yup.string().defined(),
    workingHoursId: yup.string().defined(),
    departmentIds: yup.string().defined(),
    serviceIds: yup.string().defined(),
    status: yup.boolean().defined(),
    branchLogo: yup.string().defined(),
    documentPath: yup.string().defined(),

    remarks: yup.string().trim().defined()
        .max(1000, "Remarks must not exceed 1000 characters")
});

export default branchSchema;