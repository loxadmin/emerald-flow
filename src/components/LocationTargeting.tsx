import { useEffect, useState, useMemo } from "react";
import { Country, State, ICountry, IState } from "country-state-city";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MapPin, Search, Check, ChevronDown, X, Globe2, ShieldAlert } from "lucide-react";

interface LocationTargetingProps {
  selectedCountries: string[]; // Country ISO codes e.g. ["NG", "US"] or names
  selectedStates: string[]; // State names e.g. ["Lagos", "Abuja"]
  onChange: (countries: string[], states: string[]) => void;
  compact?: boolean;
}

export default function LocationTargeting({
  selectedCountries = [],
  selectedStates = [],
  onChange,
  compact = false,
}: LocationTargetingProps) {
  const [disabledCountryKeys, setDisabledCountryKeys] = useState<string[]>([]);
  const [countrySearch, setCountrySearch] = useState("");
  const [stateSearch, setStateSearch] = useState("");
  const [countryPopoverOpen, setCountryPopoverOpen] = useState(false);
  const [activeCountryForStates, setActiveCountryForStates] = useState<string>("NG");

  // Fetch disabled countries from admin_settings
  useEffect(() => {
    let isMounted = true;
    const fetchDisabled = async () => {
      const { data } = await supabase
        .from("admin_settings")
        .select("value")
        .eq("key", "disabled_target_countries")
        .maybeSingle();

      if (isMounted && data?.value) {
        try {
          const parsed = JSON.parse(data.value);
          if (Array.isArray(parsed)) {
            setDisabledCountryKeys(parsed.map((k: string) => String(k).toUpperCase()));
          }
        } catch {
          // If stored as comma-separated string
          setDisabledCountryKeys(data.value.split(",").map((s) => s.trim().toUpperCase()));
        }
      }
    };
    fetchDisabled();
    return () => { isMounted = false; };
  }, []);

  const allCountries = useMemo(() => Country.getAllCountries(), []);

  // Helper to normalize country key (handles both ISO code like "NG" or name like "Nigeria")
  const getCountryIso = (key: string): string => {
    if (!key) return "";
    const upper = key.toUpperCase();
    const found = allCountries.find(
      (c) => c.isoCode.toUpperCase() === upper || c.name.toUpperCase() === upper
    );
    return found ? found.isoCode : key;
  };

  // Filter out countries disabled by admin
  const isCountryDisabled = (c: ICountry): boolean => {
    return (
      disabledCountryKeys.includes(c.isoCode.toUpperCase()) ||
      disabledCountryKeys.includes(c.name.toUpperCase())
    );
  };

  // Selected country ISO codes
  const selectedCountryIsos = useMemo(() => {
    return selectedCountries.map(getCountryIso).filter(Boolean);
  }, [selectedCountries, allCountries]);

  // Available states for selected countries (or active country tab)
  const availableStatesForActiveCountry = useMemo(() => {
    const targetIso = activeCountryForStates || selectedCountryIsos[0] || "NG";
    return State.getStatesOfCountry(targetIso);
  }, [activeCountryForStates, selectedCountryIsos]);

  // Keep active country tab updated
  useEffect(() => {
    if (selectedCountryIsos.length > 0 && !selectedCountryIsos.includes(activeCountryForStates)) {
      setActiveCountryForStates(selectedCountryIsos[0]);
    } else if (selectedCountryIsos.length === 0 && !activeCountryForStates) {
      setActiveCountryForStates("NG");
    }
  }, [selectedCountryIsos, activeCountryForStates]);

  const filteredCountries = useMemo(() => {
    if (!countrySearch.trim()) return allCountries;
    const term = countrySearch.toLowerCase();
    return allCountries.filter(
      (c) => c.name.toLowerCase().includes(term) || c.isoCode.toLowerCase().includes(term)
    );
  }, [allCountries, countrySearch]);

  const filteredStates = useMemo(() => {
    if (!stateSearch.trim()) return availableStatesForActiveCountry;
    const term = stateSearch.toLowerCase();
    return availableStatesForActiveCountry.filter((s) => s.name.toLowerCase().includes(term));
  }, [availableStatesForActiveCountry, stateSearch]);

  const toggleCountry = (country: ICountry) => {
    if (isCountryDisabled(country)) return;

    const iso = country.isoCode;
    const isAlreadySelected = selectedCountryIsos.includes(iso);

    let nextCountries: string[];
    let nextStates = [...selectedStates];

    if (isAlreadySelected) {
      nextCountries = selectedCountryIsos.filter((c) => c !== iso);
      // Remove states belonging to this country
      const countryStates = State.getStatesOfCountry(iso).map((s) => s.name);
      nextStates = nextStates.filter((s) => !countryStates.includes(s));
    } else {
      nextCountries = [...selectedCountryIsos, iso];
    }

    onChange(nextCountries, nextStates);
  };

  const toggleState = (stateName: string) => {
    const isAlreadySelected = selectedStates.includes(stateName);
    let nextStates: string[];
    if (isAlreadySelected) {
      nextStates = selectedStates.filter((s) => s !== stateName);
    } else {
      nextStates = [...selectedStates, stateName];
    }
    onChange(selectedCountryIsos, nextStates);
  };

  const selectAllStatesForActiveCountry = () => {
    const stateNames = availableStatesForActiveCountry.map((s) => s.name);
    const combined = Array.from(new Set([...selectedStates, ...stateNames]));
    onChange(selectedCountryIsos, combined);
  };

  const clearStatesForActiveCountry = () => {
    const stateNames = availableStatesForActiveCountry.map((s) => s.name);
    const remaining = selectedStates.filter((s) => !stateNames.includes(s));
    onChange(selectedCountryIsos, remaining);
  };

  const activeCountryObj = useMemo(() => {
    return allCountries.find((c) => c.isoCode === activeCountryForStates) || null;
  }, [allCountries, activeCountryForStates]);

  return (
    <div className={`space-y-3 rounded-xl border border-border bg-card p-4 ${compact ? "text-xs" : ""}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary shrink-0" />
          <div>
            <Label className="text-xs font-semibold text-foreground">Target Location & States</Label>
            <p className="text-[11px] text-muted-foreground">
              Select target countries and specific states/regions for your users
            </p>
          </div>
        </div>
        {selectedCountryIsos.length > 0 && (
          <Badge variant="outline" className="text-[10px] font-semibold text-primary border-primary/30">
            {selectedCountryIsos.length} country(s) · {selectedStates.length} state(s)
          </Badge>
        )}
      </div>

      {/* Country Selection Dropdown/Popover */}
      <div className="space-y-1.5">
        <Label className="text-[11px] text-muted-foreground font-medium">Target Countries *</Label>
        <Popover open={countryPopoverOpen} onOpenChange={setCountryPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              className="w-full justify-between h-9 text-xs border-border/60 bg-background/50 hover:bg-background"
            >
              <div className="flex items-center gap-2 truncate">
                <Globe2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                {selectedCountryIsos.length === 0 ? (
                  <span className="text-muted-foreground">Select countries (e.g. Nigeria)</span>
                ) : (
                  <span className="font-medium text-foreground truncate">
                    {selectedCountryIsos
                      .map((iso) => {
                        const c = allCountries.find((x) => x.isoCode === iso);
                        return c ? `${c.flag} ${c.name}` : iso;
                      })
                      .join(", ")}
                  </span>
                )}
              </div>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50 ml-1" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[320px] sm:w-[380px] p-2 bg-card border-border" align="start">
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search countries..."
                  value={countrySearch}
                  onChange={(e) => setCountrySearch(e.target.value)}
                  className="pl-8 h-8 text-xs bg-muted/40"
                />
              </div>
              <div className="max-h-60 overflow-y-auto space-y-0.5 pr-1">
                {filteredCountries.map((c) => {
                  const selected = selectedCountryIsos.includes(c.isoCode);
                  const disabled = isCountryDisabled(c);
                  return (
                    <button
                      key={c.isoCode}
                      type="button"
                      disabled={disabled}
                      onClick={() => toggleCountry(c)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                        disabled
                          ? "opacity-50 cursor-not-allowed bg-muted/20"
                          : selected
                          ? "bg-primary/10 text-foreground font-semibold"
                          : "hover:bg-muted/60 text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-base leading-none">{c.flag}</span>
                        <span className="truncate">{c.name}</span>
                      </div>
                      {disabled ? (
                        <span className="text-[10px] text-destructive font-medium flex items-center gap-1">
                          <ShieldAlert className="h-3 w-3" /> Disabled
                        </span>
                      ) : selected ? (
                        <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                      ) : null}
                    </button>
                  );
                })}
                {filteredCountries.length === 0 && (
                  <p className="p-3 text-center text-xs text-muted-foreground">No countries found</p>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Selected Country Badges */}
      {selectedCountryIsos.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {selectedCountryIsos.map((iso) => {
            const country = allCountries.find((c) => c.isoCode === iso);
            if (!country) return null;
            const isActive = activeCountryForStates === iso;
            return (
              <Badge
                key={iso}
                variant={isActive ? "default" : "secondary"}
                className={`cursor-pointer gap-1.5 px-2.5 py-1 text-xs transition-colors ${
                  isActive ? "bg-primary text-primary-foreground" : "hover:bg-secondary/80"
                }`}
                onClick={() => setActiveCountryForStates(iso)}
              >
                <span>{country.flag}</span>
                <span>{country.name}</span>
                <X
                  className="h-3 w-3 hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCountry(country);
                  }}
                />
              </Badge>
            );
          })}
        </div>
      )}

      {/* State / Region Selection for Active Country */}
      {selectedCountryIsos.length > 0 && activeCountryObj && (
        <div className="mt-3 pt-3 border-t border-border/60 space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <span>{activeCountryObj.flag}</span>
              <span>States / Regions for {activeCountryObj.name}</span>
            </Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px] text-primary"
                onClick={selectAllStatesForActiveCountry}
              >
                Select All
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px] text-muted-foreground hover:text-destructive"
                onClick={clearStatesForActiveCountry}
              >
                Clear
              </Button>
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground">
            Leave state selection empty to target all states in {activeCountryObj.name}, or check specific states below:
          </p>

          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder={`Search states in ${activeCountryObj.name}...`}
              value={stateSearch}
              onChange={(e) => setStateSearch(e.target.value)}
              className="pl-8 h-7 text-xs bg-background/50"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto p-1.5 rounded-lg border border-border/40 bg-background/30">
            {filteredStates.map((st: IState) => {
              const checked = selectedStates.includes(st.name);
              return (
                <label
                  key={st.isoCode || st.name}
                  className={`flex items-center gap-2 p-1.5 rounded-md cursor-pointer text-xs transition-colors ${
                    checked ? "bg-primary/10 font-semibold text-foreground" : "hover:bg-muted/40 text-foreground/80"
                  }`}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggleState(st.name)}
                    className="h-3.5 w-3.5"
                  />
                  <span className="truncate">{st.name}</span>
                </label>
              );
            })}
            {filteredStates.length === 0 && (
              <p className="col-span-full p-2 text-center text-xs text-muted-foreground">
                No states available for {activeCountryObj.name}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
