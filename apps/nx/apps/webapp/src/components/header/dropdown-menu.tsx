"use client";

import { Dropdown, DropdownItem, DropdownMenu, DropdownSection, DropdownTrigger, Link } from "@heroui/react";

import { FaMoneyCheckDollar, FaQuestion } from "react-icons/fa6";
import { GrMapLocation } from "react-icons/gr";
import { DashboardIcon } from "./icon/dashboard";
import { MenuIcon } from "./icon/menu";

const iconClasses = "text-xl text-default-500 pointer-events-none flex-shrink-0";

const MenuDropDown = (params: any) => {
    const session = params.session;
    const hasSession = session !== null;
    return (
        <Dropdown showArrow radius="sm" backdrop="blur">
            <DropdownTrigger>
                <div>
                    <MenuIcon />
                </div>
            </DropdownTrigger>

            <DropdownMenu
                aria-label="Custom item styles"
                className="p-3"
                itemClasses={{
                    base: [
                        "rounded-md",
                        "text-default-800",
                        "text-2xl",
                        "transition-opacity",
                        "data-[hover=true]:text-foreground",
                        "data-[hover=true]:bg-default-100",
                        "dark:data-[hover=true]:bg-default-50",
                        "data-[selectable=true]:focus:bg-default-50",
                        "data-[pressed=true]:opacity-70",
                        "data-[focus-visible=true]:ring-default-500",
                    ],
                }}
            >
                <DropdownSection aria-label="Menu Items">
                    <DropdownItem className="pb-4" textValue="dashboard"
                        startContent={<Link className="text-2xl" color="foreground" href="/dashboard"><DashboardIcon className={iconClasses}/></Link>}
                        key="dashboard">
                        <Link className="text-2xl" color="foreground" href="/dashboard">
                            Dashboard
                        </Link>
                    </DropdownItem>

                    <DropdownItem className="pb-4" textValue="routes"
                        startContent={<Link className="text-2xl" color="foreground" href="/routes"><GrMapLocation size={24} className={iconClasses} /></Link>}
                        key="routes">
                        <Link className="text-2xl" color="foreground" href="/routes">
                            Routes
                        </Link>
                    </DropdownItem>

                    <DropdownItem className="pb-4" textValue="sponsors"
                        startContent={<Link className="text-2xl" color="foreground" href="/sponsors"><FaMoneyCheckDollar size={24} className={iconClasses} /></Link>}
                        key="sponsors">
                        <Link className="text-2xl" color="foreground" href="/sponsors">
                            Sponsors
                        </Link>
                    </DropdownItem>

                    <DropdownItem className="pb-4" textValue="faq"
                        startContent={<Link className="text-2xl" color="foreground" href="/faq"><FaQuestion size={24} className={iconClasses} /></Link>}
                        key="faq">
                        <Link className="text-2xl" color="foreground" href="/faq">
                            FAQ
                        </Link>
                    </DropdownItem>

                </DropdownSection>
            </DropdownMenu>
        </Dropdown>
    );
};

export default MenuDropDown;