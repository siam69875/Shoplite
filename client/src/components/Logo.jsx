import { useStoreInfo } from '../storeInfo.jsx';

// The store name and region come from the server settings, so header and footer always match.
export default function Logo() {
  const { name, region } = useStoreInfo();
  return (
    <>
      <span className="logo-mark">{name.charAt(0)}</span>
      <span className="logo-text">{name}<small>{region}</small></span>
    </>
  );
}
