export const createMetaData = (
  imageUri: string,
  description: string,
  treatType: string,
  expiry: string,
  additionaAttributes: any,
) => {
  return {
    description: description,
    external_url: "https://EduTreat.xyz",
    image: imageUri,
    name: "EduTreat",
    background_color: "000000",
    attributes: [
      {
        trait_type: "issuer",
        value: "EduTreat",
      },
      {
        trait_type: "treat_type",
        value: treatType,
      },
      {
        trait_type: "treat_expiry",
        value: expiry,
      },
    ],
  };
};
