import {
  type FC,
  type ChangeEvent,
  type MouseEvent,
  useEffect,
  useState,
  useCallback,
} from "react";

import { Box, Button, Center, Flex, HStack, Image, Input, Select, Spinner, Text, VStack, useToken } from "@chakra-ui/react";
import { getAttestations } from "@coinbase/onchainkit/identity";
import { TokenSearch, TokenSelectDropdown, getTokens } from "@coinbase/onchainkit/token";
import type { Token } from "@coinbase/onchainkit/token";
import axios from "axios";
import { ethers } from "ethers";
import { debounce } from 'lodash';
import { baseSepolia } from "viem/chains";
import { useAccount, useChainId, useReadContract, useWriteContract } from "wagmi";

import { TOKEN_TREAT_CONTRACT_ADDRESS, TOKEN_TREAT_ABI, ERC20ABI } from "@/config";
import { useSignMessageHook, useNotify } from "@/hooks";
import type { ContractAddress } from "@/types";
import { getDefaultEthersSigner, getEthersSigner } from "@/utils/clientToEtherjsSigner";
import { uploadFile, uploadJson, urlToFile } from "@/utils/ipfsHelper";
import { createMetaData } from "@/utils/nftHelpers";
import { convertToUnixTimestamp } from "@/utils/timeUtils";

import LoadingScreen from "./LoadingScreen";

const CreateTokenTreat: FC = () => {
  const account = useAccount();
  const chainId = useChainId();
  const tokenTreatContractAddress = TOKEN_TREAT_CONTRACT_ADDRESS[chainId];
  const [treatName, setTreatName] = useState("");
  const [treatValue, setTreatValue] = useState("");
  const [treatType, setTreatType] = useState("");
  const [treatDescription, setTreatDescription] = useState("");
  const [treatImage, setTreatImage] = useState<FileList | null | unknown>(null);
  const [treatValidity, setTreatValidity] = useState("");
  const [treatToken, setTreatToken] = useState("");
  const [burnOnClaims, setburnOnClaim] = useState("");
  const [refundTreasury, setRefundTreasury] = useState("");
  const [transferable, setTransferable] = useState("");
  const [receipients, setReceipients] = useState("");
  const [platformFee, setPlatformFee] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [totalChargeableAmount, setTotalChargeableAmount] = useState("");

  const [imagePromt, setImagePromt] = useState("");

  const [imagePromtUrl, setImagePromtUrl] = useState("");

  const [fetchingImage, setFetchingImage] = useState(false);

  const [selectTokenList, setSelectTokenList] = useState([
    {
      name: "BNB",
      address: "0x0000000000000000000000000000000000000000",
      symbol: "BNB",
      decimals: 18,
      image: "https://www.iconarchive.com/download/i109472/cjdowner/cryptocurrency-flat/Binance-Coin-BNB.1024.png",
      chainId: 5611,
    },
    ,
    {
      name: "STONE",
      address: "0xE31861dbB1608066Edea809a2E3c2a078ae1c9Bc",
      symbol: "STONE",
      decimals: 18,
      image:
        "data:image/png;base64,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",
      chainId: 5611,
    },
    {
      name: "BUSD",
      address: "0xa9ad1484d9bfb27adbc2bf50a6e495777cc8cff2",
      symbol: "BUSD",
      decimals: 18,
      image:
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSx-TMU0n9SG4ZriUh0Gij2Td6Xu6pXhmK8lg&s",
      chainId: 5611,
    }
  ]);

  const [selectTreatToken, setSelectTreatToken] = useState("");

  const [isLoading, setIsLoading] = useState(false);

  const getTokenData = async () => {
    const signer = await getDefaultEthersSigner();
    let tokenContract = null;
    let tokenDecimals = null;
    let tokenSymbol = null;
    if (treatToken === "0x0000000000000000000000000000000000000000") {
      tokenDecimals = 18;
      tokenSymbol = "BNB";
    } else {
      // Get token Contract
      tokenContract = new ethers.Contract(treatToken, ERC20ABI, signer);
      // Get Token Decimal
      tokenDecimals = await tokenContract.decimals();

      // Get Token Symbol
      tokenSymbol = await tokenContract.symbol();
    }

    return { tokenContract, tokenDecimals, tokenSymbol };
  };

  const checkAndSetAmounts = async () => {
    console.log("chainid", chainId, tokenTreatContractAddress)

    if (!treatValue || treatValue === "" || !treatToken || treatToken === "") return;
    const signer = await getDefaultEthersSigner();

    const { tokenDecimals, tokenSymbol } = await getTokenData();

    // Get Token Treat Contract
    const tokenTreatContract = new ethers.Contract(
      tokenTreatContractAddress,
      TOKEN_TREAT_ABI,
      signer,
    );

    // Convert Treat amount in decimals
    const treatAmountInUnits = ethers.parseUnits(treatValue, tokenDecimals);
    // Get Platform fee
    const platformFeeInUnits = await tokenTreatContract.calculatePlatformFee(treatAmountInUnits);

    // Get Total Fee
    const totalAmountinUnits = treatAmountInUnits + platformFeeInUnits;

    console.log(`Total amount in units: ${totalAmountinUnits}`);

    // Set the Platform Fee
    setPlatformFee(ethers.formatUnits(platformFeeInUnits, tokenDecimals));
    console.log(`Platform Fee: ${ethers.formatUnits(platformFeeInUnits, tokenDecimals)}`);
    // Set the Token Symbol
    setTokenSymbol(tokenSymbol);
    // Set the Total Chargeable Amount
    setTotalChargeableAmount(ethers.formatUnits(totalAmountinUnits, tokenDecimals));
    console.log(
      `Total Chargeable Amount: ${ethers.formatUnits(totalAmountinUnits, tokenDecimals)}`,
    );
  };

  useEffect(() => {
    if (selectTreatToken) {
      setTreatToken(selectTreatToken.address);
    }
  }, [selectTreatToken]);

  useEffect(() => {
    const fetchTokenData = async () => {
      try {
        if (treatToken) {
          const tokenData = await getTokenData();
          const checkList = selectTokenList.filter((token) => {
            return token.address === treatToken;
          });

          if (checkList.length === 0) {
            console.log("Token Not Found");
            setSelectTokenList([
              ...selectTokenList,
              {
                name: tokenData.tokenSymbol,
                address: treatToken,
                symbol: tokenData.tokenSymbol,
                decimals: tokenData.tokenDecimals,
                image: "",
                chainId: chainId,
              },
            ]);

            setSelectTreatToken({
              name: tokenData.tokenSymbol,
              address: treatToken,
              symbol: tokenData.tokenSymbol,
              decimals: tokenData.tokenDecimals,
              image: "",
              chainId: chainId,
            });
          }
        }
      } catch (error) {
        console.log(error);
      }
    };
    fetchTokenData();
  }, [treatToken]);

  useEffect(() => {
    checkAndSetAmounts();
  }, [treatValue, treatToken]);

  useEffect(() => {
    const getUserData = async () => {
      if (receipients) {
        const receipientsAddresses = receipients.split(",");
        console.log(receipientsAddresses);

        const COINBASE_VERIFIED_ACCOUNT_SCHEMA_ID =
          "0x2f34a2ffe5f87b2f45fbc7c784896b768d77261e2f24f77341ae43751c765a69";

        const address = receipientsAddresses[0] as string;
        const attestationsOptions = {
          schemas: [COINBASE_VERIFIED_ACCOUNT_SCHEMA_ID],
        };

        const attestations = await getAttestations(address, baseSepolia, attestationsOptions);

        console.log(attestations);
      }
    };
    getUserData();
  }, [receipients]);

  const { notifyError, notifySuccess } = useNotify();

  const createImage = async (imagePromtPassed?: string) => {
    setFetchingImage(true);
    const options = {
      method: "POST",
      url: "/api/corcel",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        Authorization: "3ff413ba-70e0-4e3b-9de4-ec02b21525e1",
      },
      data: {
        imagePromt: imagePromtPassed || imagePromt ,
      },
    };

    const response = await axios.request(options);
    console.log(response.data);
    setImagePromtUrl(response.data[0].image_url);
    console.log(imagePromtUrl);
    const file = await urlToFile(response.data[0].image_url, "nft-img", "png");
    setTreatImage(file);
    setFetchingImage(false);
    return response.data;
  };

  const debouncedFetchResults = useCallback(debounce((promt)=> createImage(promt), 5000), []);

  // useEffect(() => {
  //   if (imagePromt && imagePromt !== "") {
  //     createImage();
  //   }
  // }, [imagePromt]);

  useEffect(() => {
    setFetchingImage(true)
  },[imagePromt])

  const handlePromtChange = (e: any) => {
    const { value } = e.target;
    setImagePromt(value);
    console.log(imagePromt)
    debouncedFetchResults(value);
  };

  const createTreat = async () => {
    setIsLoading(true);
    // const imageData = await createImage()
    const signer = await getDefaultEthersSigner();
    const tokenTreatContract = new ethers.Contract(
      tokenTreatContractAddress,
      TOKEN_TREAT_ABI,
      signer,
    );
    try {
      const { tokenContract, tokenDecimals } = await getTokenData();
      console.log(totalChargeableAmount);
      const totalChargeableAmountInUnits = ethers.parseUnits(totalChargeableAmount, tokenDecimals);

      if (tokenContract) {
        const currentAllowance = await tokenContract.allowance(
          account.address,
          TOKEN_TREAT_CONTRACT_ADDRESS[chainId],
        );
        if (currentAllowance < totalChargeableAmountInUnits) {
          const tx = await tokenContract.approve(
            tokenTreatContractAddress,
            totalChargeableAmountInUnits,
          );
          await tx.wait();
        }
      }

      const treatImageHash = await uploadFile(treatImage);
      console.log(treatImageHash);
      const metadata = createMetaData(
        treatImageHash,
        treatDescription,
        treatType,
        treatValidity,
        {},
      );
      const metadataHash = await uploadJson(metadata);
      console.log(metadataHash);

      const receipientsAddresses = receipients.split(",");

      const treatValueInUnits = ethers.parseUnits(treatValue, tokenDecimals);

      if (receipientsAddresses.length == 0) {
        notifyError({ title: "Error", message: "Please enter a receipient address" });
      } else if (receipientsAddresses.length == 1) {
        console.log("tokenContract", tokenContract);
        const tx = await tokenTreatContract.mintTreat(
          receipientsAddresses[0].trim(),
          metadataHash,
          convertToUnixTimestamp(treatValidity),
          treatValueInUnits,
          treatToken,
          refundTreasury,
          burnOnClaims === "true",
          transferable === "true",
          treatType,
          { value: tokenContract ? 0 : totalChargeableAmountInUnits },
        );
        console.log(tx);
        await tx.wait();
        notifySuccess({
          title: "Success",
          message: "Treat created successfully TxHash: " + tx.hash,
        });
      } else {
        notifyError({
          title: "Error",
          message: "Not supported yet, please enter only one receipient address",
        });
      }
    } catch (error: any | ethers.BytesLike) {
      console.log(error);
      if (error.data)
        console.log(tokenTreatContract.interface.parseError(ethers.getBytes(error.data)));
      notifyError({ title: "Error", message: "Error creating treat, please try again later" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    
  }, [notifyError, notifySuccess]);

  return (

    <>

<Flex w={"100%"} display={"flex"} justifyContent={"center"} alignContent={"center"} flexWrap={"wrap"} gap={0}>

{imagePromtUrl && (
        <Box boxSize="sm" className="ml-4">
           {fetchingImage? (<Center
      top="0"
      left="0"
      width="100%"
      height="100%"
      bg="rgba(0, 0, 0, 0.5)"
      // zIndex="1000"
    >
      <Spinner size="xl" />
      <Text marginLeft={2}>Fetching Image using AI</Text>
    </Center>): (<Image src={URL.createObjectURL(treatImage[0] as any)} alt="Selected Image" boxSize="100%" objectFit="cover" />)}
        </Box>
      )}
<Flex direction="column" align="start" w="100%">
          <Text fontSize="md" fontWeight="medium">Select NFT Image</Text>
          <Text fontSize="sm" color="gray.500" mb={2}>Choose one of the following options to set an image for your NFT.</Text>
          <VStack spacing={4} w="100%">
            <Box w="100%">
              <Text fontSize="sm" color="gray.600">Input an AI prompt:</Text>
              <Input
                placeholder="Enter AI prompt"
                value={imagePromt}
                onChange={(e) => handlePromtChange(e)}
                mb={2}
              />
              {/* {imagePromtUrl && (
                <Image src={imagePromtUrl} alt="AI generated image" boxSize="100px" mt={2} />
              )} */}

              OR
            </Box>
            <Box w="100%">
              <Text fontSize="sm" color="gray.600">Upload an image from your computer:</Text>
              <Input
                type="file"
                onChange={(e) => setTreatImage(e.target.files)}
                mb={2}
              />
              {/* {treatImage && (
                <Image src={URL.createObjectURL(treatImage[0])} alt="Uploaded image" boxSize="100px" mt={2} />
              )} */}
            </Box>
          </VStack>
        </Flex>
    </Flex>

 
    <Flex w={"100%"} display={"flex"} justifyContent={"space-around"} flexWrap={"wrap"} gap={5}>
      <LoadingScreen isLoading={isLoading} />

      

      <VStack w={"45%"} minWidth={"270px"} gap={2}>
        <Text textAlign="left" fontWeight="bold">
          Treat Name
        </Text>
        <Input
          value={treatName}
          onChange={(e) => setTreatName(e.target.value)}
          type="textarea"
          placeholder="Enter Treat Name"
        />
      </VStack>

      <VStack w={"45%"} minWidth={"270px"} gap={2} textAlign="left">
        <Text textAlign="left" fontWeight="bold">
          Treat Type
        </Text>
        <Select
          value={treatType}
          onChange={(e) => {
            setTreatType(e.target.value);
          }}
        >
          <option value="None">Select an option</option>
          <option value="discount">Discount Coupon</option>
          <option value="giveaway">Giveaway</option>
          <option value="gift">Gift</option>
          <option value="prize">Prize</option>
        </Select>
      </VStack>

      <VStack w={"45%"} minWidth={"270px"} gap={2} textAlign="left">
        <Text textAlign="left" fontWeight="bold">
          Treat Value
        </Text>
        <Input
          value={treatValue}
          onChange={(e) => setTreatValue(e.target.value)}
          type="textarea"
          placeholder="Treat Value"
        />
      </VStack>

      <VStack w={"45%"} minWidth={"270px"} gap={2} textAlign="left">
        <Text textAlign="left" fontWeight="bold">
          Token Address for Treat
        </Text>
        <Flex>
          <TokenSelectDropdown
            token={selectTreatToken}
            setToken={setSelectTreatToken}
            options={selectTokenList}
          />
          <Input
            value={treatToken}
            onChange={(e) => setTreatToken(e.target.value)}
            type="textarea"
          />
        </Flex>
      </VStack>

      <VStack w={"45%"} minWidth={"270px"} gap={2} textAlign="left">
        <Text textAlign="left" fontWeight="bold">
          Burn On Claim
        </Text>
        <Select
          value={burnOnClaims}
          onChange={(e) => {
            setburnOnClaim(e.target.value);
          }}
        >
          <option value="None">Select an option</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </Select>
      </VStack>

      <VStack w={"45%"} minWidth={"270px"} gap={2} textAlign="left">
        <Text textAlign="left" fontWeight="bold">
          Is Transferable
        </Text>
        <Select
          value={transferable}
          onChange={(e) => {
            setTransferable(e.target.value);
          }}
        >
          <option value="None">Select an option</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </Select>
      </VStack>

      <VStack w={"45%"} minWidth={"270px"} gap={2} textAlign="left">
        <Text textAlign="left" fontWeight="bold">
          Treat Description
        </Text>
        <Input
          value={treatDescription}
          onChange={(e) => setTreatDescription(e.target.value)}
          type="textarea"
          placeholder="Treat Description"
        />
      </VStack>

      {/* <VStack w={"45%"} minWidth={"270px"} gap={2} textAlign="left">
        <Text textAlign="left" fontWeight="bold">
          NFT Image Promt
        </Text>
        <Input
          value={imagePromt}
          onChange={(e) => setImagePromt(e.target.value)}
          type="textarea"
          placeholder="Enter Image Promt for NFT"
        />
      </VStack>

      <VStack w={"45%"} minWidth={"270px"} gap={2} textAlign="left">
        <Text textAlign="left" fontWeight="bold">Treat Image</Text>
        <Input
          onChange={(e) => setTreatImage(e?.target?.files)}
          type="file"
        />
      </VStack> */}

      <VStack w={"45%"} minWidth={"270px"} gap={2} textAlign="left">
        <Text textAlign="left" fontWeight="bold">
          Treat Validity
        </Text>
        <Input
          value={treatValidity}
          onChange={(e) => {
            setTreatValidity(e.target.value);
          }}
          type="datetime-local"
        />
      </VStack>

      <VStack w={"45%"} minWidth={"270px"} gap={2} textAlign="left">
        <Text textAlign="left" fontWeight="bold">
          Refund Treasury Address
        </Text>
        <Input
          value={refundTreasury}
          onChange={(e) => setRefundTreasury(e.target.value)}
          type="text"
          placeholder="Address where unclaimed funds will be sent"
        />
      </VStack>

      <VStack w={"100%"} minWidth={"270px"} gap={2} textAlign="left">
        <Text textAlign="left" fontWeight="bold">
          Receipinets
        </Text>
        <Input
          value={receipients}
          onChange={(e) => setReceipients(e.target.value)}
          type="text"
          placeholder="Address of receipient of this nft, separate address using comma (,)"
        />
      </VStack>
      <VStack w={"100%"} minWidth={"270px"} gap={2} textAlign="left">
        {platformFee && totalChargeableAmount && tokenSymbol && (
          <Box p={4} borderWidth={1} borderRadius="lg" borderColor="teal.500" bg="gray.50">
            <Text fontWeight="bold" fontSize="lg" color="teal.700">
              Invoice:
            </Text>
            <Text fontWeight="bold" color="teal.600">
              Treat Amount:{" "}
              <Text as="span" color="black">
                {treatValue} {tokenSymbol}
              </Text>
            </Text>
            <Text fontWeight="bold" color="teal.600">
              Platform Fee:{" "}
              <Text as="span" color="black">
                {platformFee} {tokenSymbol}
              </Text>
            </Text>
            <Text fontWeight="bold" color="teal.600">
              Total Chargeable Amount:{" "}
              <Text as="span" color="black">
                {totalChargeableAmount} {tokenSymbol}
              </Text>
            </Text>
          </Box>
        )}
      </VStack>

      <VStack w={"45%"} minWidth={"270px"} gap={2} textAlign="left">
        <Button
          colorScheme="teal"
          variant="solid"
          onClick={() => {
            createTreat();
          }}
          isLoading={isLoading}
          className="custom-button"
        >
          Create a Treat
        </Button>
      </VStack>
    </Flex>



    </>
  );
};

export default CreateTokenTreat;
