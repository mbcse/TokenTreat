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

const CreateEduTreat: FC = () => {
  const account = useAccount();
  const chainId = useChainId();
  const EduTreatContractAddress = TOKEN_TREAT_CONTRACT_ADDRESS[chainId];
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
      name: "EDU",
      address: "0x0000000000000000000000000000000000000000",
      symbol: "EDU",
      decimals: 18,
      image: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAADICAMAAACahl6sAAAAV1BMVEUA7b7///8UG+sIns8SNebv/vsP7sK/+u/P/PMPUOAB4MEFuMk/8c5v9dqf+OcLd9gTKOh/9t4IktIMatoHrMyP9+Lf/fcv8MoOXd0QQuIC08QDxcYKhNXREjedAAAEjUlEQVR4nO3d51bjMBAFYBlIKKHDFpZ9/+dcyuZAYpW5UzzSHN+fYMnzHZMQObKUJptcp0I2RidM+j1ScqN/WtXOsGieWg9yAyq0MTo98RCqFoVuRAo1i7SPHwoMFYusAy3FR27dIKqMj3hAfuozRBRmy3MbhoDCa2fHYFM4rWwZTArexp6ROB8tUch2EUfCLwrYYCkGToEOX5KBSpCjF3ZgFPqxi706eBLyoR6Mt1xoQ5wciXxRaMf98nNQJaTDPBlUCeUoZwdtpEKAeDPeowHxNnxGDvEW7COFeNf/FRFk41399wggXTkakupvvSs/DhfiXfc8PIh31blwIN4154NDvCsuZItCvAsuBoR4l1sJBHEdf7SCQLxrrYcO8a60FSrEu85miBCX+z5YaBDvKimhQLxrJGV+u2sG8S6RmDCQed2DOlqQAd6x9qlDkJ4eTwzCliS248XCcbo85NTCgVyQI0liOpKJ4ykKBHIcShLT0QVkk4dg80ssHJcgJOUhWB8WkGcUcp6DgPOWLCBXKCTlIGAXFhDYEQeS5hC0hxWiC0nHELiDFaIMSYcQfB5ypxC8/QrRhqTvEEbzFaIO2fQH+cOTfEE4rS0gd1Eg91EgzBdJ2kNYz3mZQPAByQGE1fjeAgKPdRUgVxYQwd8WG5JeLSC/JRBe27c8GUhcIP0kDOQhCiSFgnjXoJIV0lvCQBIdcmnw3w/5xlAN0tXn9hykuO7Hce4sIMyhVA5CjwXk5NUB0tMIRAQxmemg9SoZ7hvp8JCHKBAoZ1EgFkNbF4j3BC21mMxs8oDsVsgKsclzFEiYF7vJiMQDYjHadYFYOFbIUaC58D1DkJmlJv9GPAZWJp/iXxwgFg58hqwc0sGs/iqEvBxC1w7glulfA4bWTS0I0nmiQK6jQMJ80fMOYa4B3VdCfT29QjqKcC7K7vJMPbw5dKL5WiafWc54pYggFg6PGXQmoxP+BeFDLBwnOxkkzLzfFaId8dz4Xp5WELxE+oLwHGEgIZ+xWiEdQA4f3wvzZOi4kOkIchsFEuYx8FEh0wwSZqmEMSFTBjLiuii9QuBHxaYsZLy1g8JApgLEf+7sowPEZKam1opn/pcEeTR/W4FAK957TwOeKhDwLXh3qh76TeypChnoO4YokKkBGUUyWyd3BhlEMi97TMis6kGXkp4XPeYq5VTIhXedrWRqHnIB/FzJI25JkN9PNA/pWlKoOP/jjiWlggs/h+88LpVCvcNtbVMqd7TNhorVDrb9U7nYsTbkqtQ61BZp1Q2pq5C+JPWNteuQniSNDcIbkH4kjTqH2WqzVeYom582q6RsR9vBniTtIofY6ZhWI+UgZwmtRNJRnpLG2y4I8ZMQ6yNDvCj08shHekjoxSGQ5W8TAbVBkIUvynw/Nz3IkhS0MPD4pSRoWThkEUpx91xViD2FVROnke1+56yKmBB0ryhzBh8y2fyBCarhN9WniGqRNFalyAqRQtQs8jLEPSi8hynUoAL56MdVMelBJpZF7+SakPcA6z7qnlgb8r/Teq5NzmnR6T6H12d73m7Bzz/z/2G5qgh3wwAAAABJRU5ErkJggg==",
      chainId: 656476,
    },
    {
      name: "USDC",
      address: "0x77721D19BDfc67fe8cc46ddaa3cc4C94e6826E3C",
      symbol: "USDC",
      decimals: 18,
      image:
        "https://d3r81g40ycuhqg.cloudfront.net/wallet/wais/44/2b/442b80bd16af0c0d9b22e03a16753823fe826e5bfd457292b55fa0ba8c1ba213-ZWUzYjJmZGUtMDYxNy00NDcyLTg0NjQtMWI4OGEwYjBiODE2",
      chainId: 656476,
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
      tokenSymbol = "EDU";
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
    console.log("chainid", chainId, EduTreatContractAddress)

    if (!treatValue || treatValue === "" || !treatToken || treatToken === "") return;
    const signer = await getDefaultEthersSigner();

    const { tokenDecimals, tokenSymbol } = await getTokenData();

    // Get Token Treat Contract
    const EduTreatContract = new ethers.Contract(
      EduTreatContractAddress,
      TOKEN_TREAT_ABI,
      signer,
    );

    // Convert Treat amount in decimals
    const treatAmountInUnits = ethers.parseUnits(treatValue, tokenDecimals);
    // Get Platform fee
    const platformFeeInUnits = await EduTreatContract.calculatePlatformFee(treatAmountInUnits);

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
    const EduTreatContract = new ethers.Contract(
      EduTreatContractAddress,
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
            EduTreatContractAddress,
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
        const tx = await EduTreatContract.mintTreat(
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
        console.log(EduTreatContract.interface.parseError(ethers.getBytes(error.data)));
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
          <option value="discount">Edu Discount Coupon</option>
          <option value="giveaway">Giveaway</option>
          <option value="gift">Gift</option>
          <option value="prize">Prize</option>
          <option value="other">Credentials</option>
          <option value="other">Certificate</option>
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

export default CreateEduTreat;